'use strict';

var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');

// Log entries data - to be modified with builds
var authInfo = !empty(avaTaxClient.getAuthInfo()) ? avaTaxClient.getAuthInfo() : {
	url: '',
	user: '',
	le_url: ''
};

var authUser = !empty(authInfo.user) ? authInfo.user.toString() : '';
var serviceUrl = !empty(authInfo.url) ? (avaTaxClient.getAuthInfo().url.toString().toLowerCase().indexOf('sandbox') === -1 ? 'Production' : 'Sandbox') : '';

var connectorName = 'AvaTax for SF B2C/SFRA';
var connectorVersion = '23.2.0v2';
var clientString = 'SF B2C Commerce || ' + connectorVersion;
var erpDetails = 'Salesforce';

/**
 * Config/ Debug logs sent to Avalara
 * @param {*} source Source
 * @param {*} operation Operation
 * @param {*} message Message
 * @param {*} logType LogType
 * @param {*} logLevel LogLevel
 * @param {*} functionName FunctionName
 * @param {*} docCode DocCode
 */
function avConfigDebugLogs({source, operation, message, logType, logLevel, functionName, docCode}) {
    var logModel = {};

    
    logModel.CallerAccuNum = authUser || '';
    logModel.AvaTaxEnvironment = serviceUrl;
    logModel.ERPDetails = erpDetails;
    logModel.ConnectorName = connectorName;
    logModel.ConnectorVersion = connectorVersion;
    logModel.ClientString = clientString;

    logModel.Source = source || '';
    logModel.Operation = operation || '';
    logModel.Message = message || '';
    logModel.LogType = logType || '';
    logModel.LogLevel = logLevel || '';
    logModel.FunctionName = functionName || '';
    logModel.DocCode = docCode || '';

    logModel.CreationDate = new Date();
    avaTaxClient.leLog(logModel);
};

/**
 * Performance Logs sent to Avalara
 * @param {*} source Source
 * @param {*} operation Operation
 * @param {*} message Message
 * @param {*} logType LogType
 * @param {*} logLevel LogLevel
 * @param {*} functionName FunctionName
 * @param {*} docCode DocCode
 * @param {*} docType docType
 * @param {*} lineCount lineCount
 * @param {*} connectorTime connectorTime
 * @param {*} connectorLatency connectorLatency
 */
function avPerformanceLogs({source, operation, message, logType, logLevel, functionName, docCode, docType, lineCount, connectorTime, connectorLatency}) {
    var logModel = {};

    logModel.CallerAccuNum = authUser || '';
    logModel.AvaTaxEnvironment = serviceUrl;
    logModel.ERPDetails = erpDetails;
    logModel.ConnectorName = connectorName;
    logModel.ConnectorVersion = connectorVersion;
    logModel.ClientString = clientString;

    logModel.Source = source || '';
    logModel.Operation = operation || '';
    logModel.Message = message || '';
    logModel.LogType = logType || '';
    logModel.LogLevel = logLevel || '';
    logModel.FunctionName = functionName || '';

    logModel.DocCode = docCode || '';
    logModel.LineCount = lineCount || '';
    logModel.DocType = docType || '';
    logModel.ConnectorTime = connectorTime || '';
    logModel.ConnectorLatency = connectorLatency || '';

    logModel.CreationDate = new Date();
    avaTaxClient.leLog(logModel);
};


module.exports = {
    avConfigDebugLogs: avConfigDebugLogs,
    avPerformanceLogs: avPerformanceLogs
}