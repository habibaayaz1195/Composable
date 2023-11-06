/* eslint-disable no-undef */
/*
 * AvaTax REST service client
 */
/* eslint-disable no-unused-vars */
'use strict';

// API includes
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

// Custom logger
var LOGGER = require('dw/system/Logger').getLogger('Avalara', 'AvaTax');

// Global service componentnts
var svc;
var config;
var url;
var user;
var password;
var encodedAuthStr;
var credential;
var clientHeaderStr;


/**
 * Initialize the service components
 */
function initservice() {
    // Create a service object
    svc = LocalServiceRegistry.createService('avatax.rest.all', {
        createRequest: function (_svc, args) {
            if (args) {
                return JSON.stringify(args);
            }
            return null;
        },
        parseResponse: function (_svc, client) {
            return client.text;
        }
    });
    // Configure the service related parameters
    config = svc.getConfiguration();
    credential = config.getCredential();
    url = !empty(credential.getURL()) ? credential.getURL() : '';
    user = credential.getUser();
    password = credential.getPassword();
    encodedAuthStr = require('dw/util/StringUtils').encodeBase64(user + ':' + password);

    if (session.privacy.sitesource && session.privacy.sitesource === 'sgjc') {
        clientHeaderStr = 'SF B2C/SGJC || 22.1.1v2; a0o5a000007TAVHAA4';
    } else {
        clientHeaderStr = 'SF B2C/SFRA || 23.2.0v2; a0o5a000008TGIBAA4'; // (app name); (app version); (library name); (library version); (machine name)
    }

    svc.addHeader('Accept', 'application/json');
    svc.addHeader('X-Avalara-Client', clientHeaderStr);
    svc.addHeader('Authorization', 'Basic ' + encodedAuthStr);
}

// Logentries variables
var leSvc;
var leConfig;
var leCredential;
var leUrl;
var leSvcresponse;
/**
 * Initialize the log entries service and retrieve the related configuration
 */
function initLeService() {
    // Logentries service
    leSvc = LocalServiceRegistry.createService('ceplogger.avatax.svc', {
        createRequest: function (_svc, args) {
            if (args) {
                return JSON.stringify(args);
            }
            return null;
        },
        parseResponse: function (_svc, client) {
            return client.text;
        }
    });
    // Configure service related parameters
    leConfig = leSvc.getConfiguration();
    leCredential = leConfig.getCredential();
    encodedAuthStr = require('dw/util/StringUtils').encodeBase64(leCredential.getUser() + ':' + leCredential.getPassword());

    if (url.toLowerCase().indexOf('sandbox') === -1) {
        if (session.privacy.sitesource && session.privacy.sitesource === 'sgjc') {
            leUrl = leCredential.getURL() + 'a0n0b00000KU6CDAA1'; // logentries sgjc production
        } else {
            leUrl = leCredential.getURL() + 'a0n0b00000KU6CDAA1'; // logentries sfra production
        }
    } else if (session.privacy.sitesource && session.privacy.sitesource === 'sgjc') {
        leUrl = leCredential.getURL() + 'a0n0b00000KU6CDAA1'; // logentries sgjc development
    } else {
        leUrl = leCredential.getURL() + 'a0n0b00000KU6CDAA1'; // logentries sfra development
    }
    leSvc.setURL(leUrl);

    leSvc.addHeader('Authorization', 'Basic ' + encodedAuthStr);
    leSvc.addHeader('X-API-Version','1.0');
    leSvc.addHeader('Content-Type', 'application/json');
}

/**
 * Retrives auth info for AvaTax
 * @returns {*} authinfo object
 */
function getAuthInfo() {
    initservice();
    initLeService();
    return {
        url: url,
        user: user,
        leUrl: leUrl
    };
}

/**
 * Log the log details to logentries server using the logentries service call
 * @param {*} jsonLog jsonLog
 * @returns {*} log response
 */
function leLog(jsonLog) {
    initLeService();
    leSvcresponse = leSvc.call(jsonLog);
    if (leSvcresponse.status !== 'OK') {
        LOGGER.warn('Got an error calling:' + leUrl + '. The status code is: ' + leSvcresponse.status +
            ', and the text is: ' + leSvcresponse +
            ' and the error text is: ' + leSvcresponse.getErrorMessage());
        var errorResult = {
            statusCode: leSvcresponse.status,
            errorMessage: JSON.parse(leSvcresponse.getErrorMessage()),
            url: leUrl
        };
        return errorResult;
    }
    // return a plain javascript object
    return {
        success: true
    };
}

/**
 * Filters the service response object.
 * @param {*} httpResponse httpResponse
 * @returns {*} Returns error details if unsuccessful. Otherwise, the response JSON.
 */
function responseFilter(httpResponse) {
    if (httpResponse.status !== 'OK') {
        var errorResult = {
            statusCode: httpResponse.status,
            errorMessage: JSON.parse(httpResponse.getErrorMessage()),
            url: url
        };
        return errorResult;
    }
    // return a plain javascript object
    return JSON.parse(httpResponse.object);
}


/**
 * List all services to which the current user is subscribed
 * @returns {Object} a response object that contains information about the subscriptions
 */
 function getSubscriptions(acno, lkey, env, flag) {
    initservice();
    url += 'api/v2/utilities/subscriptions';
    svc.setRequestMethod('GET');
    url = encodeURI(url);
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    return responseFilter(httpResult);
}

/**
 * Resolve an address against Avalara's address-validation system
 * @param {Object} addressValidationInfo - addressValidationInfo object
 * @returns {Object} a response object that contains information about the validated address
 */
function resolveAddressPost(addressValidationInfo) {
    initservice();
    url += 'api/v2/addresses/resolve';
    svc.setRequestMethod('POST');
    url = encodeURI(url);
    svc.setURL(url);
    // service call
    var httpResult = svc.call(addressValidationInfo);
    return responseFilter(httpResult);
}

/**
 * Records a new transaction in AvaTax.
 * @param {Object} createTransactionModel object - refer AvaTax documentation
 * @param {Object} include object - refer AvaTax documentation
 * @returns {Object} a response object that contains information about the taxes
 */
function createTransaction(createTransactionModel, include) {
    initservice();
    url += 'api/v2/transactions/create' + (!empty(include) ? '?$include=' + include : '');
    svc.setRequestMethod('POST');
    url = encodeURI(url);
    svc.setURL(url);
    // service call
    var httpResult = svc.call(createTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Marks a transaction by changing its status to 'Committed'
 * @param {string} companyCode - refer AvaTax documentation
 * @param {string} transactionCode - Order number in SFCC - refer AvaTax documentation
 * @param {string} commitTransactionModel object
 * @param {string} documentType string
 * @returns {Object} a response object that contains information about the transaction
 */
function commitTransaction(companyCode, transactionCode, commitTransactionModel, documentType) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/commit' + (!empty(documentType) ? '?documentType=' + documentType : '');
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(commitTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Records a new transaction or adjust an existing transaction in AvaTax
 * @param {string} include string
 * @param {Object} createOrAdjustTransactionModel object
 * @returns {Object} a response object that contains information about the transaction
 */
function createOrAdjustTransaction(include, createOrAdjustTransactionModel) {
    initservice();
    url += 'api/v2/transactions/createoradjust' + (!empty(include) ? '?$include=' + include : '');
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(createOrAdjustTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Voids the current transaction uniquely identified by transactionCode.
 * @param {string} companyCode string
 * @param {string} transactionCode string
 * @param {Object} voidTransactionModel object
 * @returns {Object} a response object that contains information about the transaction being voided
 */
function voidTransaction(companyCode, transactionCode, voidTransactionModel) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/void';
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(voidTransactionModel);
    return responseFilter(httpResult);
}


/**
 * Replaces the current transaction uniquely identified by this URL with a new transaction.
 * @param {string}companyCode string
 * @param {string} transactionCode string
 * @param {Object} adjustTransactionModel object
 * @returns {Object} a response object that contains information about the transaction being adjusted
 */
function adjustTransaction(companyCode, transactionCode, adjustTransactionModel) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/adjust';
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);
    // service call
    var httpResult = svc.call(adjustTransactionModel);
    return responseFilter(httpResult);
}

/**
 * Build a multi - location tax content file
 * @param {*} companyCode companyCode
 * @param {*} documentDate documentDate
 * @param {*} taxCodes taxCodes
 * @param {*} locationCodes locationCodes
 * @returns {*} object
 */
function buildTaxContent(companyCode, documentDate, taxCodes, locationCodes) {
    initservice();
    url += 'api/v2/pointofsaledata/build';
    url = encodeURI(url);
    svc.setRequestMethod('POST');
    svc.setURL(url);

    documentDate = '2019-08-13';
    companyCode = 'default';
    taxCodes = ['P0000000'];
    locationCodes = ['NY', 'TN'];


    var request = {
        companyCode: companyCode,
        documentDate: documentDate,
        responseType: 'xml',
        taxCodes: taxCodes,
        locationCodes: locationCodes,
        includeJurisCodes: true
    };

    // service call
    var httpResult = svc.call(request);
    return httpResult.object;
}


/**
 * Gets all transactions for specified company for specified date range
 * @param {string} companyCode string
 * @param {string} fromDate string
 * @param {string} toDate string
 * @returns {Object} a collection object that contains information about the transactions
 */
function getTransactions(companyCode, fromDate, toDate) {
    initservice();
    if (empty(fromDate) || empty(toDate)) {
        url += 'api/v2/companies/' + companyCode + '/transactions';
    } else {
        url += 'api/v2/companies/' + companyCode + '/transactions?$filter=date between \'' + fromDate + '\' and \'' + toDate + '\' AND status <> Adjusted';
    }
    url = encodeURI(url);
    svc.setRequestMethod('GET');
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    var result = null;
    var records;
    if (httpResult.status !== 'OK') {
        result = {
            status: 'error',
            values: null,
            errorMessage: JSON.parse(httpResult.getErrorMessage())
        };
    } else {
        // return a plain javascript object
        records = JSON.parse((httpResult.object).replace('@nextLink', 'nextLink'));
    }
    var SortedMap = require('dw/util/SortedMap');
    var sm = new SortedMap();
    if (records.value) {
        for (var i = 0; i < records.value.length; i++) {
            sm.put(records.value[i].code, records.value[i]);
        }
        while (records.nextLink) {
            initservice(); //
            url += records.nextLink;
            url = encodeURI(url);
            svc.setRequestMethod('GET');
            svc.setURL(url);
            // service call
            var httpResult1 = svc.call();
            var record1;
            if (httpResult1.status !== 'OK') {
                result = {
                    status: 'error',
                    values: null,
                    errorMessage: JSON.parse(httpResponse.getErrorMessage())
                };
            } else {
                // return a plain javascript object
                record1 = JSON.parse((httpResult1.object).replace('@nextLink', 'nextLink'));
                if (record1.value) {
                    for (i = 0; i < record1.value.length; i++) {
                        sm.put(record1.value[i].code, record1.value[i]);
                    }
                }
            }
        }
        result = {
            ERROR: false,
            values: sm
        };
    } else {
        result = {
            ERROR: true,
            values: null
        };
    }
    return result;
}


/**
 * Determines whether an individual meets or exceeds the minimum legal drinking age.
 * @param {string}firstName string
 * @param {string} lastName string
 * @param {Object} address object
 * @returns {Object} a response object that contains information about the age verification of individual
 */
 function ageVerify(fName, lName, addressValidationInfo, dob) {
    initservice();
    url += 'api/v2/ageverification/verify';
    svc.setRequestMethod('POST');
    url = encodeURI(url);
    svc.setURL(url);
    var request = {
        firstName: fName,
        lastName: lName,
        address: addressValidationInfo,
        DOB: dob
    };
    // service call
    var httpResult = svc.call(request);
    return responseFilter(httpResult);
}

/**
 * Registers the transaction so that it may be included when evaluating regulations that span multiple transactions.
 * @param {string} companyCode string
 * @param {string} transactionCode string
 * @param {string} documentType string
 * @returns {Object} a response object that contains information about the 	shipment registration
 */
function registerShipment(companyCode, transactionCode, documentType) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/shipment/registration' + (!empty(documentType) ? '?documentType=' + documentType : '');
    url = encodeURI(url);
    svc.setRequestMethod('PUT');
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    return responseFilter(httpResult);
}

/**
 * Removes the transaction from consideration when evaluating regulations that span multiple transactions.
 * @param {string} companyCode string
 * @param {string} transactionCode string
 * @param {string} documentType string
 * @returns {Object} a response object that contains information about delete shipment registration status
 */
function deleteShipmentRegistration(companyCode, transactionCode, documentType) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/shipment/registration' + (!empty(documentType) ? '?documentType=' + documentType : '');
    url = encodeURI(url);
    svc.setRequestMethod('DELETE');
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    return responseFilter(httpResult);
}

/**
 * Evaluates a transaction against a set of direct-to-consumer shipping regulations and, if compliant, registers the transaction.
 * @param {string} companyCode string
 * @param {string} transactionCode string
 * @param {string} documentType string
 * @returns {Object} a response object that contains information about the compliant shimpent registration result
 */
function registerIfCompliantShipment(companyCode, transactionCode, documentType) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/shipment/registerIfCompliant' + (!empty(documentType) ? '?documentType=' + documentType : '');
    url = encodeURI(url);
    svc.setRequestMethod('PUT');
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    return responseFilter(httpResult);
}

/**
 * Evaluates a transaction against a set of direct-to-consumer shipping regulations.
 * @param {string} companyCode string
 * @param {string} transactionCode string
 * @param {string} documentType string
 * @returns {Object} a response object that contains verify shipment result
 */
function verifyShipment(companyCode, transactionCode, documentType) {
    initservice();
    url += 'api/v2/companies/' + companyCode + '/transactions/' + transactionCode + '/shipment/verify' + (!empty(documentType) ? '?documentType=' + documentType : '');
    url = encodeURI(url);
    svc.setRequestMethod('GET');
    svc.setURL(url);
    // service call
    var httpResult = svc.call();
    return responseFilter(httpResult);
}



// Module exports
module.exports = {
    getSubscriptions: getSubscriptions,
    resolveAddressPost: resolveAddressPost,
    createTransaction: createTransaction,
    commitTransaction: commitTransaction,
    createOrAdjustTransaction: createOrAdjustTransaction,
    voidTransaction: voidTransaction,
    adjustTransaction: adjustTransaction,
    getAuthInfo: getAuthInfo,
    leLog: leLog,
    getTransactions: getTransactions,
    buildTaxContent: buildTaxContent,
    ageVerify: ageVerify,
    registerShipment: registerShipment,
    deleteShipmentRegistration: deleteShipmentRegistration,
    registerIfCompliantShipment: registerIfCompliantShipment,
    verifyShipment: verifyShipment
};