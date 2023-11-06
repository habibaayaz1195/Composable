
'use strict';

// module includes
var OrderMgr = require('dw/order/OrderMgr');
var dwsystem = require('dw/system');
var dworder = require('dw/order');
var dwsite = require('dw/system/Site');
var Resource = require('dw/web/Resource');

// script includes
var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');
var avLogger = require('*/avLogger');
var calculateTaxHelper = require('*/cartridge/scripts/helpers/avatax/calculateTaxHelper');
var jsonAddress = require('*/cartridge/scripts/lineLevelAddress.json');
var bevAlcConf = require('*/cartridge/scripts/avaBevAlcConf.json');
var avataxJs = require('*/cartridge/scripts/avaTax');

// Logger includes
var LOGGER = dwsystem.Logger.getLogger('Avalara', 'AvaTax');

// Model includes
var CreateTransactionModel = require('*/cartridge/models/createTransactionModel');
var CommitTransactionModel = require('*/cartridge/models/commitTransactionModel');
var VoidTransactionModel = require('*/cartridge/models/voidTransactionModel');

// Global variables
var settingsObject = JSON.parse(dwsite.getCurrent().getCustomPreferenceValue('ATSettings'));
var isBevAlcEnabled = false;
var companyCode = settingsObject.companyCode;
var verifStatus= '';

// Labels
var cStatusCompliant = Resource.msg('label.bevalc.transaction.compliant', 'avatax_constant', null);
var cStatusNonCompliant = Resource.msg('label.bevalc.transaction.non_compliant', 'avatax_constant', null);
var cStatusCancelledButCompliant = Resource.msg('label.bevalc.transaction.cnclld_compliant', 'avatax_constant', null);

/**
 * This Utility is used to Register or Override Shipment for Bev Alc Products
 * Setting isOverride to true will result in registeration of shipment irrespective of compliance
 * @param {dw.order.Basket} basket is an Order Basket
 * @param {string} orderNo is an Order Number
 * @param {boolean} isOverride identifies an override transaction
 * @returns an Object containing Response
 */
var registerOrOverrideShipment = function (basket, orderNo, isOverride) {

    var returnObj = {};
    try {
		var resObj;

        if(!basket) {
            resObj = createOrAdjustTransaction(orderNo);
        } else {
            resObj = {
                ERROR: false
            }
        }

        if(!resObj.ERROR) {

            var complianceResObj = {};
            if(isOverride) {
                complianceResObj = callRegisterShipment(orderNo);
            } else {
                complianceResObj = callRegisterIfCompliant(orderNo);
            }

            if(complianceResObj && complianceResObj.compliant) {

                var commitResObj = commitDocument(orderNo);

                if(commitResObj.ERROR) {
                    returnObj = commitResObj;
                } else {

                    verifStatus= cStatusCompliant;

                    returnObj = {
                        ERROR: false,
                        compliant: complianceResObj.compliant,
                        msg: complianceResObj.message
                    };
                }

            } else if (complianceResObj && !complianceResObj.compliant) {
                verifStatus= cStatusNonCompliant;
                returnObj = {
                    ERROR: true,
                    msg: complianceResObj.failureMessages
                }
            } else if (complianceResObj && complianceResObj.error) {
                verifStatus= '';
                returnObj = {
                    ERROR: true,
                    msg: complianceResObj.error.message
                }
            } else {
                verifStatus= '';
                returnObj = {
                    ERROR: true,
                    msg: 'Something went wrong, please try again.'
                }
            }
            
            updateVerificationDetails({
                "orderNo": orderNo,
                "basket": basket,
                "cancelStatus": false,
                "verifStatus": verifStatus,
                "verifJSON": complianceResObj
            });
            

        } else {
            returnObj = resObj;
        }

        createLog('Informational', 'RegisterOrOverrideShipment', 'bevAlcShipmentHelper.js-registerOrOverrideShipment', null);

	} catch (e) {

        createLog('Exception', 'RegisterOrOverrideShipment', 'bevAlcShipmentHelper.js-registerOrOverrideShipment', e);

		returnObj = {
			ERROR: true,
			msg: e.message
		};
	}

    returnObj["orderno"] = orderNo;

    return returnObj;
};

var cancelOrder = function(orderNo, deleteShipmentRegistraion) {
    var returnObj = {};
    try {

        if(deleteShipmentRegistraion) {
            callDeleteShipmentRegistration(orderNo);
        }

		var returnObj = voidDocument(orderNo);

        if(!returnObj.ERROR) {
            verifStatus= 'CANCELLED';
            
            updateVerificationDetails({
                "orderNo": orderNo,
                "cancelStatus": true,
                "verifStatus": verifStatus,
                "verifJSON": returnObj
            });
        }

        createLog('Informational', 'Cancel_DeleteShipment', 'bevAlcShipmentHelper.js-cancelOrder', null);

	} catch (e) {

        createLog('Exception', 'Cancel_DeleteShipment', 'bevAlcShipmentHelper.js-cancelOrder', e);

		returnObj = {
			ERROR: true,
			msg: e.message
		};
	}

    returnObj["orderno"] = orderNo;

    return returnObj;
}

/**
 * This Utility is used to call Register Shipment if compliant for Bev Alc Products
 * @param {string} orderNo is a Order Number
 * @param {boolean} isOverride is a string
 * @returns an Object containing Response
 */
function callRegisterIfCompliant(orderNo) {
    var svcResponse = {};
    svcResponse = avaTaxClient.registerIfCompliantShipment(companyCode, orderNo, '');

    return svcResponse;
}

/**
 * This Utility is used to call register Shipment for Bev Alc Products
 * @param {string} orderNo is a Order Number
 * @returns an Object containing Response
 */
function callRegisterShipment(orderNo) {
    var svcResponse = {};
    svcResponse = avaTaxClient.registerShipment(companyCode, orderNo, '');

    if(svcResponse) return svcResponse;

    return {
        ERROR: false,
        compliant: true,
        msg: ''
    };
}

/**
 * This Utility is used to call Delete Shipment Registration for previously compliant Bev Alc Orders
 * @param {string} orderNo is a Order Number
 * @returns an Object containing Response
 */
 function callDeleteShipmentRegistration(orderNo) {
    var svcResponse = {};
    svcResponse = avaTaxClient.deleteShipmentRegistration(companyCode, orderNo, '');

    return svcResponse;
}

/**
 * Utility Method to adjust transaction on Avatax
 * @param {String} orderNo is a String
 * @returns Object containing Service Response
 */
function createOrAdjustTransaction(orderNo) {
    var resObj = {};
    var orderObj = OrderMgr.getOrder(orderNo.toString());
    var uuidLineNumbersMap = new dw.util.SortedMap();
    var lineIdShipmentIdMap = new dw.util.SortedMap();
    var svcResponse = {};
    var transactionModel = new CreateTransactionModel.CreateTransactionModel();
    var customerTaxId = !empty(customer.profile) ? customer.profile.taxID : null; // Tax ID of the customer
    var lines = []; // Lines array
    var saveTransactionsToAvatax = settingsObject.saveTransactions; // Save transaction preference in custom preferences
    var commitTransactionsToAvatax = settingsObject.commitTransactions; // Commit transactions preference

    isBevAlcEnabled= calculateTaxHelper.verifyBevAlcEnabled();

    // Extract all line item objects from orderObj
    var allLineItemsObj = calculateTaxHelper.getAllLineItems(orderObj);
    lines = allLineItemsObj.lines;
    uuidLineNumbersMap = allLineItemsObj.uuidLineNumbersMap;
    lineIdShipmentIdMap = allLineItemsObj.lineIdShipmentIdMap;

    var li;
    var line;

    // Lines array - END
    // Construct a transaction object
    if (orderNo) {
        transactionModel.code = orderNo;
        transactionModel.type = transactionModel.type.C_SALESINVOICE;
    } else {
        resObj = {
            ERROR: true,
            msg: 'Order number empty',
            orderno: orderNo
        };
        return resObj;
    }

    transactionModel.lines = lines;
    transactionModel.commit = !!(commitTransactionsToAvatax && orderNo);
    transactionModel.companyCode = companyCode;
    transactionModel.date = orderObj.creationDate;
    transactionModel.salespersonCode = null;
    transactionModel.debugLevel = transactionModel.debugLevel.C_NORMAL;
    transactionModel.serviceMode = transactionModel.serviceMode.C_AUTOMATIC;
    transactionModel.businessIdentificationNo = customerTaxId;
    transactionModel.currencyCode = orderObj.currencyCode;
    transactionModel.customerCode = empty(orderObj.getCustomerEmail()) ? 'so-cust-code' : orderObj.getCustomerEmail();

    // Uncomment the code in calculateTaxHelper.getBevAlcTransactionAttributes() to populate BevAlc Transaction Parameters on Header
    // See documentation for more info
    // (Bev Alc Subscription Required)
    if ( isBevAlcEnabled ) {
    	transactionModel.parameters = calculateTaxHelper.getBevAlcTransactionAttributes();
    }

    // ********* 	Call the tax adjustment service 	********** //
    svcResponse = avaTaxClient.createOrAdjustTransaction('', {
        createTransactionModel: transactionModel
    });

    // If AvaTax returns error, set taxes to Zero
    if (svcResponse.statusCode === 'ERROR') {
        var errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
        resObj = {
            ERROR: true,
            msg: errormsg,
            orderno: orderNo
        };
        return resObj;
    }

    // If taxes cannot be calculated
    if (svcResponse.errorMessage) {
        errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
        resObj = {
            ERROR: true,
            msg: errormsg,
            orderno: orderNo
        };
        return resObj;
    }

    if (!svcResponse.statusCode) {
        resObj = {
            ERROR: false
        };
        return resObj;
    }

    errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
    resObj = {
        ERROR: true,
        msg: errormsg,
        orderno: orderNo
    };

    return resObj;
}

/**
 * Marks a transaction by changing its status to 'Committed'.
 * @param {string} orderNo - DW order number of the transaction to be committed
 * @returns {*} A response object that contains information about the committed transaction
 */
function commitDocument(orderNo) {
    var message = '';
    var documentType = 'SalesInvoice';
    var commitTransactionModel = new CommitTransactionModel.CommitTransactionModel();

    commitTransactionModel.commit = true;

    var svcResponse = avaTaxClient.commitTransaction(companyCode, orderNo, commitTransactionModel, documentType);

    if (!empty(svcResponse.statusCode) && svcResponse.statusCode !== 'OK') {
        message = 'AvaTax commit document failed. Service configuration issue.';
    }
    if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
        if (svcResponse.errorMessage) {
            message = svcResponse.errorMessage.error.message;
        }
        if (svcResponse.message) {
            message = svcResponse.message;
        }
        if (svcResponse.error) {
            message = svcResponse.message;
        }
    }

    return {
        ERROR: !empty(message),
        msg: message
    }

}

/**
 * Voids the document.
 * @param {string} orderNo - DW order number
 * @returns {*} A response object that contains information about the voided transaction
 */
 function voidDocument(orderNo) {
    var message = '';
    var voidTransactionModel = new VoidTransactionModel.VoidTransactionModel();

    voidTransactionModel.code = voidTransactionModel.code.C_DOCVOIDED;

    var svcResponse = avaTaxClient.voidTransaction(companyCode, orderNo, voidTransactionModel);

    if (!empty(svcResponse.statusCode) && svcResponse.statusCode !== 'OK') {
        message = 'AvaTax void document failed. Service configuration issue.';
    }
    if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
        if (svcResponse.errorMessage) {
            message = svcResponse.errorMessage.error.message;
        }
        if (svcResponse.message) {
            message = svcResponse.message;
        }
        if (svcResponse.error) {
            message = svcResponse.message;
        }
    }

    return {
        ERROR: !empty(message),
        msg: message
    }
}

/**
 * Utility method to update Bev Alc Related order fields
 * @param {object} dataJSON contains order related data
 */
function updateVerificationDetails(dataJSON){

	var txn = require('dw/system/Transaction');

    txn.begin();

    var basket = dataJSON.basket ? dataJSON.basket : OrderMgr.getOrder(dataJSON.orderNo);

    txn.wrap(
        function () {
            basket.custom.ATVerificationStatus = dataJSON.verifStatus;
            basket.custom.ATVerificationJSON = JSON.stringify(dataJSON.verifJSON);
            if(dataJSON.cancelStatus) basket.setStatus(6);
        }
    );

    txn.commit();
}

function createLog(logLevel, operation, functionName, e){
    var jsonLog = {
        source: 'tax',
        operation: 'CreateTransaction',
        message: operation + ' successful.',
        logType: 'Debug',
        logLevel: logLevel,
        functionName: functionName
    };

    if(logLevel === 'Exception') {
        jsonLog['Message'] = operation + ' failed. ';
        jsonLog['Message'] += e.hasOwnProperty('stack') ? e.stack : e.message;
    }

    avLogger.avConfigDebugLogs(jsonLog);
}

module.exports = {
    registerOrOverrideShipment: registerOrOverrideShipment,
    cancelOrder: cancelOrder
}
