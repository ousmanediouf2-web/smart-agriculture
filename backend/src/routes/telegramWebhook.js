const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Sensor = require('../models/Sensor');
const Parcel = require('../models/Parcel');
const Measure = require('../models/Measure');
const Alert = require('../models/Alert');
const PumpLog = require('../models/PumpLog');
const { sendTelegram } = require('../services/telegramService');
const { detectAndReply } = require('../services/assistantLogic');
const { emitPumpState } = require('../socket/socketManager');

/**
 * Webhook Telegram — reçoit les messages envoyés par les utilisateurs au bot
 * et exécute des commandes : /on, /off, /status, /alertes, /meteo, /aide
 * ou transmet à l'assistant pour les questions libres.
 *
 * Configuration (une seule fois, après déploiement) :
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL_BACKEND>/api/telegram/webhook
 */

function sendText(chatId, messageBody) {
  return sendTelegram(chatId, 'raw', { message: messageBody });
}

async function findUserByChatId(chatId) {
  return User.findOne({ telegramChatId: String(chatId) });
}

async function getUserSensors(userId) {
  var userParcels = await Parcel.find({ userId: userId }).select('_id name cropType');
  var parcelIdList = userParcels.map(function (p) { return p._id; });
  var userSensors = await Sensor.find({ parcelId: { $in: parcelIdList } }).populate('parcelId', 'name cropType');
  return { sensorList: userSensors, parcelList: userParcels };
}

async function setSensorPump(sensorDoc, desiredState, triggeredByName) {
  sensorDoc.pumpState = desiredState;
  sensorDoc.pumpMode = 'manual';
  await sensorDoc.save();
  emitPumpState(sensorDoc._id, sensorDoc.parcelId, desiredState, 'manual');
  await PumpLog.create({
    sensorId: sensorDoc._id,
    parcelId: sensorDoc.parcelId,
    action: desiredState ? 'on' : 'off',
    trigger: 'manual',
    reason: 'Commande Telegram par ' + triggeredByName
  });
}

async function setSensorAutoMode(sensorDoc, triggeredByName) {
  sensorDoc.pumpMode = 'auto';
  await sensorDoc.save();
  await PumpLog.create({
    sensorId: sensorDoc._id,
    parcelId: sensorDoc.parcelId,
    action: 'auto_mode',
    trigger: 'manual',
    reason: 'Retour en mode automatique via Telegram par ' + triggeredByName
  });
}

router.post('/webhook', async function (req, res) {
  try {
    var incomingMessage = req.body ? req.body.message : null;

    if (!incomingMessage || !incomingMessage.text) {
      res.sendStatus(200);
      return;
    }

    var telegramChatId = incomingMessage.chat.id;
    var messageText = String(incomingMessage.text).trim();
    var senderFirstName = (incomingMessage.from && incomingMessage.from.first_name) || '';

    var matchedUser = await findUserByChatId(telegramChatId);

    if (messageText === '/start') {
      var startGreeting = matchedUser
        ? ('Bonjour *' + matchedUser.name + '* 👋\n\nTon compte AgroSmart est bien lié à ce chat. Tape /aide pour voir les commandes disponibles.')
        : ('Bonjour *' + senderFirstName + '* 👋\n\nVoici ton Chat ID : `' + telegramChatId + '`\n\nCopie ce nombre dans la page *Paramètres* de AgroSmart pour activer les notifications et le pilotage de ta pompe.');
      await sendText(telegramChatId, startGreeting);
      res.sendStatus(200);
      return;
    }

    if (/^\/id$/i.test(messageText)) {
      var idMessage = matchedUser
        ? ('🔑 Ton Chat ID Telegram est :\n\n`' + telegramChatId + '`\n\nIl est déjà lié à ton compte *' + matchedUser.name + '*.')
        : ('🔑 Ton Chat ID Telegram est :\n\n`' + telegramChatId + '`\n\nCopie ce nombre dans la page *Paramètres* de AgroSmart pour le lier à ton compte.');
      await sendText(telegramChatId, idMessage);
      res.sendStatus(200);
      return;
    }

    if (!matchedUser) {
      await sendText(telegramChatId, "Ce chat n'est lié à aucun compte AgroSmart.\nTon Chat ID est `" + telegramChatId + "` — colle-le dans Paramètres pour l'activer.");
      res.sendStatus(200);
      return;
    }

    var contextData = await getUserSensors(matchedUser._id);
    var userSensorList = contextData.sensorList;
    var userParcelList = contextData.parcelList;

    if (/^\/(aide|help)$/i.test(messageText)) {
      var helpMessage = '🌾 *Commandes AgroSmart*\n\n' +
        '/id — Affiche ton Chat ID Telegram\n' +
        '/on — Active la pompe (ou /on NomParcelle)\n' +
        '/off — Désactive la pompe (ou /off NomParcelle)\n' +
        '/auto — Repasse en mode automatique (ou /auto NomParcelle)\n' +
        '/status — État de tes capteurs\n' +
        '/alertes — Alertes non lues\n' +
        '/meteo — Résumé de tes mesures récentes\n' +
        '/aide — Cette liste\n\n' +
        '💬 Tu peux aussi écrire normalement : "Donne-moi des conseils", "Y a-t-il des alertes ?", etc.';
      await sendText(telegramChatId, helpMessage);
      res.sendStatus(200);
      return;
    }

    var pumpCommandMatch = messageText.match(/^\/(on|off)(?:\s+(.+))?$/i);
    if (pumpCommandMatch) {
      var wantPumpOn = pumpCommandMatch[1].toLowerCase() === 'on';
      var targetParcelName = pumpCommandMatch[2] ? pumpCommandMatch[2].trim().toLowerCase() : null;

      if (!userSensorList.length) {
        await sendText(telegramChatId, "Tu n'as pas encore de capteur configuré.");
        res.sendStatus(200);
        return;
      }

      var sensorTargets = userSensorList;
      if (targetParcelName) {
        sensorTargets = userSensorList.filter(function (s) {
          return s.parcelId && s.parcelId.name && s.parcelId.name.toLowerCase().indexOf(targetParcelName) !== -1;
        });
        if (!sensorTargets.length) {
          await sendText(telegramChatId, 'Aucune parcelle trouvée pour "' + targetParcelName + '". Tape /status pour voir tes parcelles.');
          res.sendStatus(200);
          return;
        }
      }

      for (var i = 0; i < sensorTargets.length; i++) {
        await setSensorPump(sensorTargets[i], wantPumpOn, matchedUser.name);
      }

      var targetNamesList = sensorTargets.map(function (s) {
        return '• ' + (s.parcelId ? s.parcelId.name : s.name);
      }).join('\n');

      await sendText(telegramChatId,
        (wantPumpOn ? '💧' : '⭕') + ' Pompe *' + (wantPumpOn ? 'ACTIVÉE' : 'ARRÊTÉE') + '* sur :\n' +
        targetNamesList + '\n\nMode passé en manuel — tape /auto pour repasser en automatique.'
      );
      res.sendStatus(200);
      return;
    }

    var autoCommandMatch = messageText.match(/^\/auto(?:\s+(.+))?$/i);
    if (autoCommandMatch) {
      var targetParcelNameAuto = autoCommandMatch[1] ? autoCommandMatch[1].trim().toLowerCase() : null;

      if (!userSensorList.length) {
        await sendText(telegramChatId, "Tu n'as pas encore de capteur configuré.");
        res.sendStatus(200);
        return;
      }

      var sensorTargetsAuto = userSensorList;
      if (targetParcelNameAuto) {
        sensorTargetsAuto = userSensorList.filter(function (s) {
          return s.parcelId && s.parcelId.name && s.parcelId.name.toLowerCase().indexOf(targetParcelNameAuto) !== -1;
        });
        if (!sensorTargetsAuto.length) {
          await sendText(telegramChatId, 'Aucune parcelle trouvée pour "' + targetParcelNameAuto + '". Tape /status pour voir tes parcelles.');
          res.sendStatus(200);
          return;
        }
      }

      var alreadyAutoCount = sensorTargetsAuto.filter(function (s) { return s.pumpMode === 'auto'; }).length;

      for (var k = 0; k < sensorTargetsAuto.length; k++) {
        await setSensorAutoMode(sensorTargetsAuto[k], matchedUser.name);
      }

      var targetNamesListAuto = sensorTargetsAuto.map(function (s) {
        return '• ' + (s.parcelId ? s.parcelId.name : s.name);
      }).join('\n');

      var autoMsg = '🤖 Mode *AUTOMATIQUE* réactivé sur :\n' + targetNamesListAuto +
        '\n\nL\'irrigation reprend selon les seuils d\'humidité de chaque culture, sans intervention manuelle.';
      if (alreadyAutoCount === sensorTargetsAuto.length) {
        autoMsg = '✅ Déjà en mode automatique sur :\n' + targetNamesListAuto;
      }

      await sendText(telegramChatId, autoMsg);
      res.sendStatus(200);
      return;
    }

    if (/^\/status$/i.test(messageText)) {
      if (!userSensorList.length) {
        await sendText(telegramChatId, "Tu n'as pas encore de capteur configuré.");
        res.sendStatus(200);
        return;
      }
      var statusLines = userSensorList.map(function (s) {
        var isOnline = s.lastSeen && (Date.now() - new Date(s.lastSeen).getTime()) < 10 * 60 * 1000;
        var soilVal = (s.lastMeasure && s.lastMeasure.soilHumidity != null) ? s.lastMeasure.soilHumidity.toFixed(0) + '%' : 'N/A';
        var tempVal = (s.lastMeasure && s.lastMeasure.temperature != null) ? s.lastMeasure.temperature.toFixed(0) + '°C' : 'N/A';
        var parcelLabel = s.parcelId ? s.parcelId.name : s.name;
        return (isOnline ? '🟢' : '🔴') + ' *' + parcelLabel + '* — Sol: ' + soilVal + ' | Temp: ' + tempVal + ' | Pompe: ' + (s.pumpState ? '💧 ON' : '⭕ OFF') + ' (' + (s.pumpMode === 'auto' ? '🤖 auto' : '✋ manuel') + ')';
      });
      await sendText(telegramChatId, '📊 *État de tes capteurs*\n\n' + statusLines.join('\n\n'));
      res.sendStatus(200);
      return;
    }

    if (/^\/alertes$/i.test(messageText)) {
      var parcelIdsForAlerts = userParcelList.map(function (p) { return p._id; });
      var unreadAlertList = await Alert.find({ parcelId: { $in: parcelIdsForAlerts }, acknowledged: false })
        .sort({ createdAt: -1 }).limit(8).populate('parcelId', 'name');
      if (!unreadAlertList.length) {
        await sendText(telegramChatId, "✅ Aucune alerte non lue. Tout va bien !");
      } else {
        var alertLines = unreadAlertList.map(function (a) {
          return '⚠️ *' + (a.parcelId ? a.parcelId.name : 'Parcelle') + '*: ' + a.message;
        });
        await sendText(telegramChatId, 'Tu as *' + unreadAlertList.length + ' alerte(s)* :\n\n' + alertLines.join('\n'));
      }
      res.sendStatus(200);
      return;
    }

    if (/^\/meteo$/i.test(messageText)) {
      var sensorIdsForMeteo = userSensorList.map(function (s) { return s._id; });
      var recentMeasureList = await Measure.find({ sensorId: { $in: sensorIdsForMeteo } }).sort({ recordedAt: -1 }).limit(20);
      if (!recentMeasureList.length) {
        await sendText(telegramChatId, "Pas encore de mesure enregistrée.");
      } else {
        var sumSoil = 0, sumTemp = 0;
        for (var j = 0; j < recentMeasureList.length; j++) {
          sumSoil += recentMeasureList[j].soilHumidity;
          sumTemp += recentMeasureList[j].temperature;
        }
        var avgSoilVal = (sumSoil / recentMeasureList.length).toFixed(1);
        var avgTempVal = (sumTemp / recentMeasureList.length).toFixed(1);
        await sendText(telegramChatId, '🌡️ *Conditions récentes*\n\nHumidité sol moy.: ' + avgSoilVal + '%\nTempérature moy.: ' + avgTempVal + '°C\nDernières ' + recentMeasureList.length + ' mesures.');
      }
      res.sendStatus(200);
      return;
    }

    var assistantReply = await detectAndReply(matchedUser, messageText);
    await sendText(telegramChatId, assistantReply);

    res.sendStatus(200);
  } catch (webhookError) {
    console.error('Erreur webhook Telegram:', webhookError.message, webhookError.stack);
    res.sendStatus(200);
  }
});

module.exports = router;
