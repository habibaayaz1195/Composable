
'use strict';

var LOGGER = require('dw/system/Logger').getLogger('Avalara', 'AvaTax');

/**
 * Logs to Salesforce logs.
 * @param {*} errorMsg
 * @param {*} fileName
 * @param {*} functionName
 * @param {*} exceptionObject
 */
module.exports.log = function (errorMsg, fileName, functionName, exceptionObject) {
    LOGGER.warn('Avalara - ' + errorMsg + (!!exceptionObject ? ' Details: ' + exceptionObject.message : '') + ' [' + fileName + ' - ' + functionName + ']');
};
