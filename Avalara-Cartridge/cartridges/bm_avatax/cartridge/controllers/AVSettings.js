/**
 * The controller which handles various features on AvaTax settings page of the BM cartridge
 */
'use strict';

// API includes
var dwsite = require('dw/system/Site');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

// script includes
var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');
var avLogger = require('*/avLogger');
var r = require('~/cartridge/scripts/util/Response');

// Logger includes
var LOGGER = dw.system.Logger.getLogger('Avalara', 'AvaTax');
var params = request.httpParameterMap;

// Model includes
var AddressValidationInfo = require('*/cartridge/models/addressValidationInfo');
var CommitTransactionModel = require('*/cartridge/models/commitTransactionModel');
var VoidTransactionModel = require('*/cartridge/models/voidTransactionModel');

// AvaTax setting preference
var settingsObject = JSON.parse(dw.system.Site.getCurrent().getCustomPreferenceValue('ATSettings'));
var jsonLog;

/**
 * It is a starting point for this controller and the page
 * It fetches the current settings and fills the form
 */
function start() {
    var currentMenuItemId = params.CurrentMenuItemId.value;
    var menuname = params.menuname.value;
    var mainmenuname = params.mainmenuname.value;

    session.privacy.currentMenuItemId = currentMenuItemId;
    session.privacy.menuname = menuname;
    session.privacy.mainmenuname = mainmenuname;

    var viewObj = {
        CurrentMenuItemId: currentMenuItemId,
        menuname: menuname,
        mainmenuname: mainmenuname,
        settings: settingsObject
    };

    app.getView(viewObj).render('/avatax/settings');
}


/**
 * Get information about AvaTax subscriptions
 */
 function getSubscriptions() {
    var res = null;
    var svcResponse = null;
    var message = 'Enable Tax calculation - '+settingsObject.taxCalculation+', Enable Address Validation - '+
        settingsObject.addressValidation+', Enable Save Transactions to AvaTax - '+settingsObject.saveTransactions
        +', Enable Commit Transactions - '+settingsObject.commitTransactions+', Company Code - '+settingsObject.companyCode
        +', Location Code - '+settingsObject.locationCode+', Line 1 - '+settingsObject.line1+', Line 2 - '+settingsObject.line2+
        ', Line 3 - '+settingsObject.line3+', City - '+settingsObject.city+', State - '+settingsObject.state+', PostalCode - '+
        settingsObject.zipCode+', CountryCode - '+settingsObject.countryCode;

    try {
        //Get Subscriptions for account 
        svcResponse = avaTaxClient.getSubscriptions(params.user.value, params.lkey.value, params.env.value, true);
        if (svcResponse.code == 'AuthenticationIncomplete' || svcResponse.code == 'AuthenticationException' || svcResponse.statusCode === 'ERROR') {
            jsonLog = {
                source: 'ConfigurationPage',
                operation: 'GetSubscriptions',
                message: 'Authentication failed',
                logType: 'Debug',
                logLevel: 'Exception',
                functionName: 'avaTax.js-getSubscriptions()'
            };
            avLogger.avConfigDebugLogs(jsonLog);
            
            res = {
                success: false,
                authenticated: false,
                message: 'Error - Authentication failed'
            };
        } else {
            //Get Subscriptions successful, fetch subscribed services
            var services = [];
            if (svcResponse.value.length > 0) {
                for (var currService = 0; currService < svcResponse.value.length; currService++) {
                    var svc = svcResponse.value[currService];
                    services.push(svc.subscriptionDescription);
                }
            }
            //Push subscriptions to settings object
            settingsObject["subscriptions"] = services;
            
            dw.system.Transaction.wrap(function () {
                dwsite.getCurrent().setCustomPreferenceValue('ATSettings', JSON.stringify(settingsObject));
            });
            jsonLog = {
                source: 'ConfigurationPage',
                operation: 'getSubscriptions',
                message: 'Get Subscriptions Successful. ' + message,
                logType: 'ConfigAudit',
                logLevel: 'Informational',
                functionName: 'AVSettings.js-getSubscriptions()'
            };
            avLogger.avConfigDebugLogs(jsonLog);
        
            res = {
                success: true,
                message: 'Authentication successful - ' + svcResponse.value[0].accountId,
                authenticated: true,
                services: services
            };
        }
    } catch (error) {
        // Problem checking the AvaTax connection
        jsonLog = {
            source: 'ConfigurationPage',
            operation: 'GetSubscriptions',
            message: 'There was a problem checking the AvaTax connection',
            logType: 'Debug',
            logLevel: 'Exception',
            functionName: 'avaTax.js-getSubscriptions()'
        };
        avLogger.avConfigDebugLogs(jsonLog);
        res = {
            success: false,
            message: 'There was a problem checking the AvaTax connection.'
        };
    }
    if (!res) {
        jsonLog = {
            source: 'ConfigurationPage',
            operation: 'GetSubscriptions',
            message: 'There was a problem checking the AvaTax connection',
            logType: 'Debug',
            logLevel: 'Exception',
            functionName: 'avaTax.js-getSubscriptions()'
        };
        avLogger.avConfigDebugLogs(jsonLog);
        res = {
            success: false,
            message: 'There was a problem checking the AvaTax connection.'
        };
    }
    r.renderJSON(res);
}


/**
 * Saves form data to setting preference - ATSettings
 */
function saveFormData() {
    try {
        var formData = {
            taxCalculation: params.taxCalculation.booleanValue,
            addressValidation: params.addressValidation.booleanValue,
            taxationpolicy: params.taxationpolicy.value,
            saveTransactions: params.saveTransactions.booleanValue,
            commitTransactions: params.commitTransactions.booleanValue,
            companyCode: params.companyCode.value,
            useCustomCustomerCode: params.useCustomCustomerCode.value,
            customCustomerAttribute: params.customCustomerAttribute.value,
            defaultShippingMethodTaxCode: params.defaultShippingMethodTaxCode.value,
            locationCode: params.locationCode.value,
            line1: params.line1.value,
            line2: params.line2.value,
            line3: params.line3.value,
            city: params.city.value,
            state: params.state.value,
            zipCode: params.zipCode.value,
            countryCode: params.countryCode.value
        };
        settingsObject.taxCalculation=formData.taxCalculation;
        settingsObject.addressValidation=formData.addressValidation;
        settingsObject.saveTransactions=formData.saveTransactions;
        settingsObject.commitTransactions=formData.commitTransactions;
        settingsObject.companyCode=formData.companyCode;
        settingsObject.useCustomCustomerCode=formData.useCustomCustomerCode;
        settingsObject.defaultShippingMethodTaxCode=formData.defaultShippingMethodTaxCode;
        settingsObject.locationCode=formData.locationCode;
        settingsObject.line1=formData.line1;
        settingsObject.line2=formData.line2;
        settingsObject.line3=formData.line3;
        settingsObject.city=formData.city;
        settingsObject.state=formData.state;
        settingsObject.zipCode=formData.zipCode;
        settingsObject.countryCode=formData.countryCode;

        dw.system.Transaction.wrap(function () {
            dwsite.getCurrent().setCustomPreferenceValue('ATSettings', JSON.stringify(formData));
        });
        var message = 'Enable Tax calculation - '+formData.taxCalculation+', Enable Address Validation - '+
        formData.addressValidation+', Enable Save Transactions to AvaTax - '+formData.saveTransactions
        +', Enable Commit Transactions - '+formData.commitTransactions+', Company Code - '+formData.companyCode
        +', Location Code - '+formData.locationCode+', Line 1 - '+formData.line1+', Line 2 - '+formData.line2+
        ', Line 3 - '+formData.line3+', City - '+formData.city+', State - '+formData.state+', PostalCode - '+
        formData.zipCode+', CountryCode - '+formData.countryCode;

        jsonLog = {
            source: 'ConfigurationPage',
            operation: 'ConfigChanges',
            message: message,
            logType: 'ConfigAudit',
            logLevel: 'Informational',
            functionName: 'AVSettings.js-saveFormData'
        };
        avLogger.avConfigDebugLogs(jsonLog);

        return r.renderJSON({
            success: true
        });
        
        
    } catch (e) {
        LOGGER.warn('Error while saving the form data. Error details - ' + e.message);
        jsonLog = {
            source: 'ConfigurationPage',
            operation: 'SaveFormData',
            message: 'Form data could not be saved due to error: '+ e.message,
            logType: 'Debug',
            logLevel: 'Exception',
            functionName: 'avaTax.js-saveFormData'
        };
        avLogger.avConfigDebugLogs(jsonLog);
        r.renderJSON({
            success: false,
            message: e.message
        });
    }
}


/**
 * Voids a document on AvaTax with a certain order number
 */
function voidTransaction() {
    var orderno = params.orderno.value;
    var res = null;
    var message = '';

    if (empty(orderno)) {
        message = 'Empty order no.';

        res = {
            success: false,
            message: message
        };
    } else {
        try {
            var validateOrder = dw.order.OrderMgr.getOrder(orderno.toString());

            if (!validateOrder) {
                message = 'Order not found in Business Manager.';

                res = {
                    success: false,
                    message: message
                };
            } else {
                var svcResponse = voidDocument(orderno);

                if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
                    message = 'Unsuccessful. Service response below:';

                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                } else {
                    message = 'Successful. Service response below:';
                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                }
            }
        } catch (e) {
            LOGGER.warn('There was a problem voiding the transaction - ' + orderno + '. Error - ' + e.message);
            res = {
                success: false,
                message: 'There was a problem voiding the transaction - ' + orderno + '. Please check logs.'
            };
        }
    }

    if (res == null) {
        res = {
            success: false,
            message: 'There was a problem voiding the transaction. Please check logs.'
        };
    }

    r.renderJSON(res);
}


/**
 * Commits a transaction on AvaTax with a certain order number
 */
function commitTransaction() {
    var orderno = params.orderno.value || '';

    var res = null;
    var message = '';

    if (empty(orderno)) {
        message = 'Empty order number.';

        res = {
            success: false,
            message: message
        };
    } else {
        try {
            var validateOrder = dw.order.OrderMgr.getOrder(orderno.toString());

            if (!validateOrder) {
                message = 'Order not found in Business Manager.';
                res = {
                    success: false,
                    message: message
                };
            } else {
                var svcResponse = commitDocument(orderno);

                if (svcResponse.error || svcResponse.message || svcResponse.errorMessage) {
                    message = 'Unsuccessful. Service response below:';

                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                } else {
                    message = 'Successful. Service response below:';
                    res = {
                        success: true,
                        message: message,
                        svcResponse: svcResponse
                    };
                }
            }
        } catch (e) {
            LOGGER.warn('There was a problem commiting the transaction - ' + orderno + '. Error - ' + e.message);
            res = {
                success: false,
                message: 'There was a problem commiting the transaction - ' + orderno + '. Please check logs.'
            };
        }
    }

    if (res == null) {
        res = {
            success: false,
            message: 'There was a problem commiting the transaction. Please check logs.'
        };
    }

    r.renderJSON(res);
}


/**
 * validates an address of the order
 */
function validateAddress() {
    var validateOrder;
    var address;
    var validateResponse;
    var errorMsg;
    var res = null;
    var message = '';
    var orderNo = params.orderno.value;
    validateOrder = dw.order.OrderMgr.getOrder(orderNo.toString());
    if (validateOrder) {
        var shipments = validateOrder.getShipments().iterator();
        while (shipments.hasNext()) {
            var currentShipment = shipments.next();
            address = currentShipment.shippingAddress;
            validateResponse = validateShippingAddress(address);
            if (validateResponse.messages && validateResponse.messages.length > 0) {
                message = 'Unsuccessful. Service response below:';
                res = {
                    success: true,
                    message: message,
                    svcResponse: validateResponse
                };
            } else {
                message = 'Successful. Service response below:';
                res = {
                    success: true,
                    message: message,
                    svcResponse: validateResponse
                };
            }
        }
    } else {
        errorMsg = 'Order not found in Business Manager.';
        res = {
            success: false,
            message: errorMsg
        };
    }
    r.renderJSON(res);
}


/**
 * Resolve an address against Avalara's address-validation system
 * @param {string} address dw.order address object
 * @returns {*} A response object that contains information about the validated address
 */
function validateShippingAddress(address) {
    try {
        var svcResponse = null;
        // build an addressvalidationinfo object
        var validateAddress = new AddressValidationInfo();
        validateAddress.textCase = 'Mixed';
        validateAddress.line1 = address.address1 || '';
        validateAddress.line2 = address.address2 || '';
        //validateAddress.line3 = address.address3 || '';
        validateAddress.city = address.city || '';
        validateAddress.region = address.stateCode || '';
        validateAddress.postalCode = address.postalCode || '';
        if (!empty(address.countryCode.value)) {
            validateAddress.country = address.countryCode.value || 'us';
        } else {
            validateAddress.country = address.countryCode || 'us';
        }
        // Make sure an address was provided
        if (empty(validateAddress)) {
            LOGGER.warn('AvaTax | No address provided. File - AVSettings.js');
            return;
        }
        var country = !empty(validateAddress.country) ? validateAddress.country : '';
        // countries for address validation - to be changed for Global implementation
        var countries = ['us', 'usa', 'canada'];
        if (countries.indexOf(country.toString().toLowerCase()) === -1) {
            LOGGER.warn('AvaTax | Can not validate address for this country {0}. File - AVSettings.js', country);
            return;
        }
        // Service call
        svcResponse = avaTaxClient.resolveAddressPost(validateAddress);
        return svcResponse;
    } catch (e) {
        LOGGER.warn('AvaTax | AvaTax Can not validate address at the moment. AVSettings.js~validateShippingAddress | '+e.message);
        return {
            statusCode: 'validateShippingAddressMethodFailed',
            message: e.message,
            error: true
        };
    }
}

/**
 * Marks a transaction by changing its status to 'Committed'.
 * @param {string} orderNo - DW order number of the transaction to be committed
 * @returns {*} A response object that contains information about the committed transaction
 */
function commitDocument(orderNo) {
    var message = '';

    try {
        
        var companyCode = settingsObject.companyCode || '';
        var transactionCode = orderNo;
        var commitTransactionModel = new CommitTransactionModel.CommitTransactionModel();
        var documentType = 'SalesInvoice';
        commitTransactionModel.commit = true;
        var svcResponse = avaTaxClient.commitTransaction(companyCode, transactionCode, commitTransactionModel, documentType);
        // ----------------- Logentries - START -------------------- //
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
        return svcResponse;

        
        
    } catch (e) {
        LOGGER.warn('[AvaTax | Commit document failed with error - {0}. File - AvaTax.js~commitDocument]', e.message);
        return {
            error: true,
            message: 'Document commit failed'
        };
    }
}

/**
 * Voids the document.
 * @param {string} orderNo - DW order number
 * @returns {*} A response object that contains information about the voided transaction
 */
function voidDocument(orderNo) {
    var message = '';
    try {
        var companyCode = settingsObject.companyCode || '';
        var transactionCode = orderNo;
        var voidTransactionModel = new VoidTransactionModel.VoidTransactionModel();
        voidTransactionModel.code = voidTransactionModel.code.C_DOCVOIDED;

        var svcResponse = avaTaxClient.voidTransaction(companyCode, transactionCode, voidTransactionModel);
        // ----------------- Logentries - START --------------------
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
        return svcResponse;
    } catch (e) {
        LOGGER.warn('[AvaTax | Void document failed with error - {0}. File - AvaTax.js~voidDocument]', e.message);
        return {
            error: true,
            message: 'Document void failed'
        };
    }
}


/**
 * Resolve an address against Avalara's address-validation system
 * @param {string} address dw.order address object
 * @returns {*} A response object that contains information about the validated address
 */
 function validateShipfromAddress() {
    try {
        var svcResponse = null;
        var res = null;
        // build an addressvalidationinfo object
        var validateAddress = new AddressValidationInfo();
        validateAddress.textCase = 'Mixed';
        validateAddress.line1 = params.line1.stringValue || '';
        validateAddress.line2 = params.line2.stringValue || '';
        validateAddress.line3 = params.line3.stringValue || '';
        validateAddress.city = params.city.stringValue || '';
        validateAddress.region = params.state.stringValue || '';
        validateAddress.postalCode = params.zipCode.stringValue || '';
        validateAddress.country = params.countryCode.stringValue || 'USA';
        
        // Make sure an address was provided
        if (empty(validateAddress)) {
            LOGGER.warn('AvaTax | No address provided. File - AVSettings.js');
            return;
        }

        
        var country = !empty(validateAddress.country) ? validateAddress.country : '';
        // countries for address validation - to be changed for Global implementation
        var countries = ['us', 'usa', 'canada'];
        if (countries.indexOf(country.toString().toLowerCase()) === -1) {
            LOGGER.warn('AvaTax | Can not validate address for this country {0}. File - AVSettings.js', country);
            return;
        }
       
        // Service call
        svcResponse = avaTaxClient.resolveAddressPost(validateAddress);
        
        if (svcResponse.messages && svcResponse.messages.length > 0) {
            res = {
                success: false,
                message: svcResponse.messages[0].summary.toString()
            };
        } else {
            res = {
                success: true,
                validateAddress: svcResponse.validatedAddresses[0]
            };
        }
        r.renderJSON(res);

    } catch (e) {
        LOGGER.warn('AvaTax | AvaTax Can not validate address at the moment. AVSettings.js~validateShipfromAddress | '+ e.message);
        return {
            statusCode: 'validateShipfromAddressMethodFailed',
            message: e.message,
            error: true
        };
    }
}


// Module exports
exports.Start = guard.ensure(['https'], start);
exports.Save = guard.ensure(['https'], saveFormData);
exports.Void = guard.ensure(['https'], voidTransaction);
exports.Commit = guard.ensure(['https'], commitTransaction);
exports.Validate = guard.ensure(['https'], validateAddress); 
exports.GetSubscriptions = guard.ensure(['https'], getSubscriptions);
//exports.ValidateShippingAddress = guard.ensure(['https'], validateShippingAddress);
exports.ValidateShipfromAddress = guard.ensure(['https', 'post'], validateShipfromAddress);