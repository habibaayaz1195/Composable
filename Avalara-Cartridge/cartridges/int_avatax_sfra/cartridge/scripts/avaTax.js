/* eslint-disable no-undef */
/**
 * Helps connect SF B2C to AvaTax services
 */

'use strict';
var OrderMgr = require('dw/order/OrderMgr');
var Status = require('dw/system/Status');
var dworder = require('dw/order');
var dwStringUtils = require('dw/util').StringUtils;
var dwvalue = require('dw/value');
var dwlogger = require('dw/system/Logger');
var dwsite = require('dw/system/Site');
var SortedMap = require('dw/util/SortedMap');
var Decimal = require('dw/util/Decimal');

var LOGGER = dwlogger.getLogger('Avalara', 'AvaTax');

// script includes
var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');
var avLogger = require('*/avLogger');
var calculateTaxHelper = require('*/cartridge/scripts/helpers/avatax/calculateTaxHelper');
var bevAlcShipmentHelper = require('*/cartridge/scripts/helpers/avatax/bevAlcShipmentHelper');

// Model includes
var AddressValidationInfo = require('*/cartridge/models/addressValidationInfo');
var CreateTransactionModel = require('*/cartridge/models/createTransactionModel');

// utility
var murmurhash = require('./murmurhash');

// Logger includes
var LOGGER = dwlogger.getLogger('Avalara', 'AvaTax');

// AvaTax setting preference
var settingsObject = JSON.parse(dwsite.getCurrent().getCustomPreferenceValue('ATSettings'));

var uuidLineNumbersMap;
var lineIdShipmentIdMap;
var jsonLog;
var lines = [];
var isBevAlcEnabled= calculateTaxHelper.verifyBevAlcEnabled();
var isReconciledTransaction = false;
var createInvoice = false;

/**
 * Utility class and methods to retrieve merchant settings related to AvaTax
 */
function avataxHelper() {}

avataxHelper.prototype = {
	// Get the Line item by its UUID
	getLineItemByUUID: function (basket, uuid) {
		var allLineItemsIterator = basket.allLineItems.iterator();
		while (allLineItemsIterator.hasNext()) {
			var li = allLineItemsIterator.next();
			if (li.UUID === uuid) {
				return li;
			} else if ('shippingLineItem' in li && !empty(li.shippingLineItem) && li.shippingLineItem.UUID === uuid) {
				return li.shippingLineItem;
			}
		}
		return null;
	},
	getCustomCustomerAttribute: function () {
		return settingsObject.customCustomerAttribute;
	},
	getCustomerCodePreference: function () {
		return settingsObject.useCustomCustomerCode;
	},
	saveTransactionsToAvatax: function () {
		return settingsObject.saveTransactions;
	},
	commitTransactionsToAvatax: function () {
		return settingsObject.commitTransactions;
	},
	getDefaultShippingMethodTaxCode: function () {
		return settingsObject.defaultShippingMethodTaxCode;
	},
	getDefaultProductTaxCode: function () {
		return 'P0000000';
	},
	getShipFromLocationCode: function () {
		return settingsObject.locationCode;
	},
	getShipFromLine1: function () {
		return settingsObject.line1;
	},
	getShipFromLine2: function () {
		return settingsObject.line2;
	},
	getShipFromLine3: function () {
		return settingsObject.line3;
	},
	getShipFromLatitude: function () {
		return '';
	},
	getShipFromLongitude: function () {
		return '';
	},
	getShipFromCity: function () {
		return settingsObject.city;
	},
	getShipFromStateCode: function () {
		return settingsObject.state;
	},
	getShipFromZipCode: function () {
		return settingsObject.zipCode;
	},
	getShipFromCountryCode: function () {
		return settingsObject.countryCode;
	},
	getCompanyCode: function () {
		return settingsObject.companyCode;
	},
	getFormattedDate: function () {
		var date = new Date();
		return dwStringUtils.format('{0}-{1}-{2}', date.getUTCFullYear().toString(), this.insertLeadingZero(date.getUTCMonth() + 1), this.insertLeadingZero(date.getUTCDate()));
	},
	insertLeadingZero: function (nb) {
		if (nb < 10) {
			return '0' + nb;
		}
		return '' + nb;
	}
};

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
			LOGGER.warn('AvaTax | No address provided. File - AvaTax.js');
			// Log to logentries //
			jsonLog = {
				source: 'tax',
                operation: 'ResolveAddress',
                message: 'Can not validate address since Address object is empty.',
                logType: 'Debug',
                logLevel: 'Exception',
                functionName: 'avaTax.js-validateShippingAddress'
			};
			avLogger.avConfigDebugLogs(jsonLog);
			// ------------------------------- //
			return new Status(Status.ERROR);
		}
		var country = !empty(validateAddress.country) ? validateAddress.country : '';
		// countries for address validation - to be changed for Global implementation
		var countries = ['us', 'usa', 'canada'];
		if (countries.indexOf(country.toString().toLowerCase()) === -1) {
			LOGGER.warn('AvaTax | Can not validate address for this country {0}. File - AvaTax.js', country);
			// Log to logentries //
			jsonLog = {
				source: 'tax',
                operation: 'ResolveAddress',
                message: 'Can not validate address since country - \'' + country + '\' not configured in site preferences.',
                logType: 'Debug',
                logLevel: 'Exception',
                functionName: 'avaTax.js-validateShippingAddress'
			};
			avLogger.avConfigDebugLogs(jsonLog);
			// ------------------------------- //
			return new Status(Status.ERROR);
		}
		// Service call
		svcResponse = avaTaxClient.resolveAddressPost(validateAddress);
		return svcResponse;
	} catch (e) {
		LOGGER.warn('AvaTax | AvaTax Can not validate address at the moment. AvaTax.js~validateShippingAddress '+ e.message);
		// Log to logentries //
		jsonLog = {
			source: 'tax',
			operation: 'ResolveAddress',
			message: 'ValidateAddress failed. ' + e.message,
			logType: 'Debug',
			logLevel: 'Exception',
			functionName: 'avaTax.js-validateShippingAddress'
		};
		avLogger.avConfigDebugLogs(jsonLog);
		// ------------------------------- //
		return {
			statusCode: 'validateShippingAddressMethodFailed',
			message: e.message,
			error: true
		};
	}
}


/**
 * Updates the taxes at line item level and updates the current basket
 * @param {*} basket basket
 * @param {*} svcResponse svcResponse
 */
function updateTaxes(basket, svcResponse) {
	try {
		var lines = svcResponse.lines;
		var count;
		var len = lines.length;
		for (count = 0; count < len; count++) {
			var resItem = lines[count];
			var lineUUID = uuidLineNumbersMap.get(resItem.lineNumber);
			var lineItem = avataxHelper.prototype.getLineItemByUUID(basket, lineUUID);
			if (lineItem != null) {
				var taxable = new dwvalue.Money(resItem.taxableAmount, basket.currencyCode);
				var tax = new dwvalue.Money(resItem.tax, basket.currencyCode);
				var liTotalTax = new dwvalue.Money(0, basket.currencyCode);

				var taxRate = 0;
				if (resItem.taxableAmount > 0) {
					taxRate = resItem.tax / resItem.taxableAmount;
				}

				if (tax.available && taxable.available && taxable.value > 0) {
					liTotalTax = tax;
				}

				// If Product's taxable amount is 0, and we still get tax from Avalara
				// Then that tax is also the tax rate
				// and the total amount on that line item
				if(resItem.taxableAmount == 0 && resItem.tax > 0) {
					taxRate = resItem.tax;
					liTotalTax = tax;
				}

				// overriding the tax rate explicitly
				lineItem.setTaxRate(taxRate);
				lineItem.setTax(liTotalTax);

				if (lineItem instanceof dw.order.ProductLineItem) {
					if (!lineItem.bonusProductLineItem) {
						// If Product's taxable amount is 0, and we still get tax from Avalara
						// Then, only update the tax amount
						// Else, update the Tax (which gets calculated based on Product's taxable amount)
						if(resItem.taxableAmount == 0 && resItem.tax > 0) {
							lineItem.updateTaxAmount(liTotalTax);
						} else {
							lineItem.updateTax(taxRate, taxable);
						}
					} else {
						// tax is not calculated for bonus product which is updating bonus line item's tax as /NA. it has the direct impact on basket totals.
						// Resolution - update line item tax with 0 which will resolve the tax calculation N/A for bonus line items.
						lineItem.updateTax(0);
					}
				} else if (lineItem instanceof dw.order.ShippingLineItem) {
					if (!empty(lineItem.adjustedNetPrice) && lineItem.adjustedNetPrice.value !== 0) {
						taxRate = liTotalTax / lineItem.adjustedNetPrice.value;
					}
					lineItem.updateTax(taxRate, lineItem.adjustedNetPrice);
				} else {
					if (!empty(lineItem.netPrice) && lineItem.netPrice.value !== 0) {
						taxRate = liTotalTax / lineItem.netPrice.value;
					}
					lineItem.updateTax(taxRate, lineItem.netPrice);
				}

				var pa = null;
				var paIterator = null;
				if (lineItem instanceof dworder.ProductLineItem || lineItem instanceof dworder.ProductShippingLineItem) {
					paIterator = lineItem.priceAdjustments.iterator();
					while (paIterator.hasNext()) {
						pa = paIterator.next();
						pa.updateTax(0);
					}
				} else if (lineItem instanceof dworder.ShippingLineItem) {
					paIterator = lineItem.shippingPriceAdjustments.iterator();
					while (paIterator.hasNext()) {
						pa = paIterator.next();
						pa.updateTax(0);
					}
				}
			}
		}
		var allPriceAdjustments = basket.getPriceAdjustments();
		allPriceAdjustments.addAll(basket.shippingPriceAdjustments);

		for (var i = 0; i < allPriceAdjustments.length; i++) {
			var basketPriceAdjustment = allPriceAdjustments[i];
			basketPriceAdjustment.updateTax(0);
		}

		basket.updateTotals();
	} catch (e) {
		LOGGER.warn('[AvaTax | Tax update failed with error - {0}. File - AvaTax.js~updateTaxes]', e.message);
		// get the hash for exceptionHash
		var exceptionHash = murmurhash.hashBytes(e.message.toString(), e.message.toString().length, 523);
		// If the exceptionHash doesn't change, no service call
		if (session.privacy.exceptionHash && session.privacy.exceptionHash === exceptionHash) {
			return;
		}
		// Log to logentries //
		jsonLog = {
			source: 'tax',
			operation: 'CreateTransaction',
			message: 'UpdateTax failed. avaTax.js~updateTaxes ' + e.message,
			logType: 'Debug',
			logLevel: 'Exception',
			functionName: 'avaTax.js-updateTax'
		};
		avLogger.avConfigDebugLogs(jsonLog);
		// store the hash of exceptionHash in session
		session.privacy.exceptionHash = exceptionHash;
		// ------------------------------- //
		return;
	}
}

/**
 * Updates PriceAdjustments in the Basket
 * for product, shipping and order level promotions
 * @param {*} basket  dw.order.basket
 * @returns {*} OK
 */
function updateAllPriceAdjustments(basket) {
	var lineItem = null;
	var pa = null;
	var paIterator = null;
	var allLineItemsIterator = basket.allLineItems.iterator();
	while (allLineItemsIterator.hasNext()) {
		lineItem = allLineItemsIterator.next();

		if ('shippingLineItem' in lineItem && !empty(lineItem.shippingLineItem)) {
			var shippingLineItem = lineItem.shippingLineItem;

			if (shippingLineItem instanceof dworder.ProductLineItem || shippingLineItem instanceof dworder.ProductShippingLineItem) {
				paIterator = shippingLineItem.priceAdjustments.iterator();
				while (paIterator.hasNext()) {
					pa = paIterator.next();
					pa.updateTax(0);
				}
			} else if (shippingLineItem instanceof dworder.ShippingLineItem) {
				paIterator = shippingLineItem.shippingPriceAdjustments.iterator();
				while (paIterator.hasNext()) {
					pa = paIterator.next();
					pa.updateTax(0);
				}
			}
		}

		if (lineItem instanceof dworder.ProductLineItem || lineItem instanceof dworder.ProductShippingLineItem) {
			paIterator = lineItem.priceAdjustments.iterator();
			while (paIterator.hasNext()) {
				pa = paIterator.next();
				pa.updateTax(0);
			}
		} else if (lineItem instanceof dworder.ShippingLineItem) {
			paIterator = lineItem.shippingPriceAdjustments.iterator();
			while (paIterator.hasNext()) {
				pa = paIterator.next();
				pa.updateTax(0);
			}
		}
	}

	var allPriceAdjustments = basket.getPriceAdjustments();
	allPriceAdjustments.addAll(basket.shippingPriceAdjustments);

	for (var i = 0; i < allPriceAdjustments.length; i++) {
		var basketPriceAdjustment = allPriceAdjustments[i];
		basketPriceAdjustment.updateTax(0);
	}

	return {
		OK: true
	};
}

/**
 * Initiates sales invoice creation in AvaTax upon successful checkout process.
 * @param {*} orderObj DW OrderMgr object
 * @param {string} orderNo DW order number
 * @param {string} setInvoice Invoice flag
 * @returns {*} void
 */
function calculateTaxAndCreateInvoice(basket, orderNo) {
	createInvoice = true;
	calculateTax(basket,orderNo);
}

/**
 * Records and calculates a new transaction in AvaTax and updates the tax details.
 * @param {*} basket DW Basket object
 * @param {string} orderNo DW order number
 * @returns {*} void
 */
function calculateTax(basket, orderNo) {
	if (!settingsObject.taxCalculation) {
		LOGGER.warn('AvaTax | AvaTax not enabled for this site. File - avaTax.js~calculateTax');
		return {
			OK: true
		};
	}
	var enterTime;
	var completionTime;
	enterTime = new Date().getTime();
	if (empty(basket)) {
		LOGGER.warn('[AvaTax | Empty basket. File - AvaTax.js~calculateTax]');
		// Log to logentries //
		jsonLog = {
			source: 'tax',
			operation: 'CreateTransaction',
			message: 'Unable to proceed with tax calculation as basket is empty.',
			logType: 'Debug',
			logLevel: 'Exception',
			functionName: 'avaTax.js-calculateTax'
		};
		avLogger.avConfigDebugLogs(jsonLog);

		return new Status(Status.ERROR);
	}
	try {
		uuidLineNumbersMap = new SortedMap();
		lineIdShipmentIdMap = new SortedMap();
		var transactionModel = new CreateTransactionModel.CreateTransactionModel();
		var customerTaxId = !empty(customer.profile) ? customer.profile.taxID : null; // Tax ID of the customer
		var isSellerImporterOfRecord = !empty(customer.profile) ? customer.profile.custom.ATisSellerImporterOfRecord : false;
		// Lines array
		var lines = [];
		// Save transaction preference in custom preferences
		var saveTransactionsToAvatax = avataxHelper.prototype.saveTransactionsToAvatax();
		// Commit transactions preference
		var commitTransactionsToAvatax = avataxHelper.prototype.commitTransactionsToAvatax();
		var customerCodePref = avataxHelper.prototype.getCustomerCodePreference();
		
		// Extract all line item objects from basket 
		var allLineItemsObj = calculateTaxHelper.getAllLineItems(basket);
		lines = allLineItemsObj.lines;
        uuidLineNumbersMap = allLineItemsObj.uuidLineNumbersMap;
        lineIdShipmentIdMap = allLineItemsObj.lineIdShipmentIdMap;
		var li;
		var line;

		// Lines array - END
		// Construct a transaction object
		if (createInvoice) {
			transactionModel.code = orderNo;
			//  If commit document not enabled in site preferences, type is SalesOrder
			if (saveTransactionsToAvatax) {
				transactionModel.type = transactionModel.type.C_SALESINVOICE;
			} else {
				transactionModel.type = transactionModel.type.C_SALESORDER;
			}
		} else {
			transactionModel.code = basket.UUID;
			transactionModel.type = transactionModel.type.C_SALESORDER;
		}
		transactionModel.lines = lines;
		transactionModel.commit = !!(orderNo && commitTransactionsToAvatax);
		transactionModel.companyCode = avataxHelper.prototype.getCompanyCode();
		transactionModel.date = avataxHelper.prototype.getFormattedDate();
		transactionModel.salespersonCode = null;

		// customer code
		var customerCode = 'guest-cust-code'; // for salesorder and if no email or other attribute is available
		if (customer.profile && customer && customer.authenticated) {
			// Customer authenticated
			if (customerCodePref === 'customer_number') {
				customerCode = customer.profile.customerNo;
			} else if (customerCodePref === 'customer_email') {
				customerCode = empty(basket.getCustomerEmail()) ? customer.profile.email : basket.getCustomerEmail();
			} else if (customerCodePref === 'custom_attribute') {
				var customAttr = avataxHelper.prototype.getCustomCustomerAttribute();
				if (!empty(customAttr)) {
					try {
						var customValue = customer.profile[customAttr.toString().trim()];
						customerCode = customValue;
					} catch (e) {
						customerCode = customer.profile.customerNo;
						LOGGER.warn('AvaTax - Can\'t find attribute - ' + customAttr + ' - on customer object. Using Customer Number. Error - ' + e.message);
					}
				} else {
					LOGGER.warn('Customer code custom value not provided. Using Customer Number.');
					customerCode = customer.profile.customerNo;
				}
			}
		} else {
			// Customer not authenticated
			customerCode = empty(basket.getCustomerEmail()) ? 'guest-cust-code' : basket.getCustomerEmail();
		}
		transactionModel.customerCode = customerCode;
		transactionModel.debugLevel = transactionModel.debugLevel.C_NORMAL;
		transactionModel.serviceMode = transactionModel.serviceMode.C_AUTOMATIC;
		transactionModel.businessIdentificationNo = customerTaxId;
		transactionModel.currencyCode = basket.currencyCode;
		transactionModel.isSellerImporterOfRecord = isSellerImporterOfRecord;

		// Uncomment the code in calculateTaxHelper.getBevAlcTransactionAttributes() to populate BevAlc Transaction Parameters on Header
		// See documentation for more info
		// (Bev Alc Subscription Required)
		if ( isBevAlcEnabled ) {
			transactionModel.parameters = calculateTaxHelper.getBevAlcTransactionAttributes(); 
		}
		
		// Uncomment the code below to populate Transport field in Transaction Parameters on Header
		// See documentation for more info
		// transactionModel.parameters.push({
		// 	"name":"Transport",
		// 	"value": ""
		// });

		// get the hash for transactionModel
		var hash = murmurhash.hashBytes(JSON.stringify(transactionModel), JSON.stringify(transactionModel).length, 523);
		// If the transactionModel doesn't change, no service call
		if (session.privacy.avataxtransactionmodel && session.privacy.avataxtransactionmodel === hash) {
			updateAllPriceAdjustments(basket); // update price adjustments
			basket.updateTotals();
			return {
				OK: true
			};
		}
		
		processTaxDetails(basket, transactionModel, orderNo, enterTime, hash);
	} catch (e) {
		LOGGER.warn('[AvaTax | Tax calculation failed with error - {0}. File - AvaTax.js~calculateTaxes]', e.message);
		// get the hash for exceptionHash
		var exceptionHash = murmurhash.hashBytes(e.message.toString(), e.message.toString().length, 523);
		// If the exceptionHash doesn't change, no service call
		if (session.privacy.exceptionHash && session.privacy.exceptionHash === exceptionHash) {
			return {
				ERROR: true
			};
		}
		completionTime = new Date();
		// Log to logentries //
		jsonLog = {
			source: 'Backend hook - dw.order.calculateTax',
			operation: 'CreateTransaction',
			message: 'calculateTax failed. ' + e.message,
			logType: 'Debug',
			logLevel: 'Exception',
			functionName: 'avaTax.js-calculateTax',
			docCode: orderNo || basket.UUID
		};
		avLogger.avConfigDebugLogs(jsonLog);
		// store the hash of exceptionHash in session
		session.privacy.exceptionHash = exceptionHash;
		// ------------------------------- //
		return {
			ERROR: true
		};
	}
}

function processTaxDetails(basket, transactionModel, orderNo, enterTime, hash) {
	var beforeSvcTime;
	var afterSvcTime;
	var completionTime;
	var connectorTime;
	var latencyTime;
	var svcResponse = {};
	beforeSvcTime = new Date().getTime();
	// ********* 	Call the tax calculation service 	********** //
	svcResponse = avaTaxClient.createTransaction(transactionModel, '');
	// If AvaTax returns error, set taxes to Zero
	if (svcResponse.statusCode === 'ERROR') {
		var lineItems = basket.getAllLineItems();
		for (var i = 0; i < lineItems.length; i++) {
			var lineItem = lineItems[i];
			lineItem.updateTax(0.00);
		}
		basket.updateTotals();
		// If error code in response is 'missingline', update logs
		if (svcResponse.errorMessage.error.code) {
			LOGGER.warn('AvaTax | AvaTax couldn\'t calculate taxes. Empty basket or empty shippingaddress. Error -  ' + svcResponse.errorMessage.error.message + ' Basket details - ' + basket);
		}
		return {
			OK: true
		};
	}
	afterSvcTime = new Date().getTime();
	// If taxes cannot be calculated
	if (svcResponse.errorMessage) {
		var errorJSON = svcResponse.errorMessage.error.details[0];
		LOGGER.warn('AvaTax | AvaTax couldn\'t calculate taxes for this transaction. Details:' +
			' Error Code: ' + errorJSON.code.toString() + ' message: ' + errorJSON.message +
			' Description: ' + errorJSON.description +
			' Customer details - ' + (empty(basket.getCustomerEmail()) ? 'Customer not authenticated.' : basket.getCustomerEmail()) +
			' Order details - ' + (empty(orderNo) ? ('Order number is not available. Basket UUID - ' + basket.UUID) : ('Order No. - ' + orderNo))
		);
		jsonLog = {
			source: 'tax',
			operation: 'CreateTransaction',
			message: 'CalculateTax failed. Code: ' + errorJSON.code.toString() + ' message: ' + errorJSON.message + ' Description: ' + errorJSON.description,
			logType: 'Debug',
			logLevel: 'Exception',
			functionName: 'avaTax.js-calculateTax'
			};
			avLogger.avConfigDebugLogs(jsonLog);
		return {
			ERROR: true
		};
	}
	// store the hash of transactionModel in session
	session.privacy.avataxtransactionmodel = hash;
	
	// Update the taxes if the call is successful
	if (!svcResponse.statusCode) {
		// Update tax on Basket and update custom Avatax field with response from service
		updateTaxDetails(basket, svcResponse, transactionModel, orderNo);
		// Connector metrics
		completionTime = new Date().getTime();
		completionTime = new Date();
		connectorTime = (beforeSvcTime - enterTime) + (completionTime - afterSvcTime);
		latencyTime = afterSvcTime - beforeSvcTime;
		// Log to logentries //
		var message = 'ConnectorMetrics ' +
			'Type - CreateTransaction' +
			' DocCode - ' + (orderNo || basket.UUID) +
			' Line count - ' + (basket.getAllLineItems().length) +
			' Connector time - ' + (connectorTime) +
			' Connector latency - ' + (latencyTime);
		jsonLog = {
			source: 'Backend hook - dw.order.calculateTax',
			operation: 'CreateTransaction',
			message: message,
			logType: 'Performance',
			logLevel: 'Informational',
			functionName: 'avaTax.js-calculateTax',
			docCode: orderNo || basket.UUID,
			docType: (transactionModel.type) ? transactionModel.type : 'SalesOrder',
			lineCount: basket.getAllLineItems().length,
			connectorTime: connectorTime,
			connectorLatency: latencyTime
		};
		avLogger.avPerformanceLogs(jsonLog);
		// ------------------------------- //
		
		return {
			OK: true
		};
	}
	LOGGER.warn('[AvaTax | AvaTax can\'t calculate taxes at the moment | error - {0}. File - AvaTax.js]', svcResponse.errorMessage);
	return {
		ERROR: true
	};
}

/**
 * Updates tax details provided by AvaTax service 
 * @param {*} params Basket object
 * @param {*} params Service response object
 * @param {*} params Transaction Model
 * @param {*} params Order number 
 */
function updateTaxDetails(basket, svcResponse, transactionModel, orderNo) {
	if (transactionModel.type !== 'SalesInvoice' || isReconciledTransaction) {
		// Update taxes on Basket using service response
		updateTaxes(basket, svcResponse);
	}
	// Update tax details in custom atribute - ATTaxDetail
	var taxDetailsJSON = [];
	if (svcResponse.lines) {
		lines = svcResponse.lines;
		var count;
		var len = lines.length;
		for (count = 0; count < len; count++) {
			var resItem = lines[count];
			var jsonObj = {};
			var lineNumber = resItem.lineNumber;
			var itemIdShippingId = lineIdShipmentIdMap.get(lineNumber);
			var itemId = itemIdShippingId.split('|')[0];
			var shipmentId = itemIdShippingId.split('|')[1];
			if (resItem.details) {
				var taxes = [];
				for (var i = 0; i < resItem.details.length; i++) {
					var jo = {};
					//jo.region = resItem.details[i].region;
					jo.jurisdictiontype = resItem.details[i].jurisdictionType;
					jo.jurisdiction = resItem.details[i].jurisName;
					jo.exempt = resItem.details[i].exemptAmount;
					jo.nontaxable = resItem.details[i].nonTaxableAmount;
					jo.taxable = resItem.details[i].taxableAmount;
					jo.rate = resItem.details[i].rate;
					jo.tax = resItem.details[i].tax;
					jo.taxName = resItem.details[i].taxName;
					jo.taxSubTypeId = resItem.details[i].taxSubTypeId;
					jo.taxType = resItem.details[i].taxType;
					taxes.push(jo);
				}
				jsonObj.lineitemid = itemId;
				jsonObj.shipmentid = shipmentId;
				jsonObj.taxes = taxes;
			}
			taxDetailsJSON.push(jsonObj);
			// ATTaxDetail
		}
	}

	// VAT Invoice Messages - EU & Cross border
	var invoiceMsgDetails = '';
	var landedCostMessages = '';
	var genericMsgDetails = '';

	if (svcResponse.messages && svcResponse.messages.length) {
		var svcResponseMessages = svcResponse.messages;
		for (i = 0; i < svcResponseMessages.length; i++) {
			var currentMessage = svcResponseMessages[i];
			if (currentMessage.summary.toString().toLowerCase().indexOf('invoice  messages') !== -1) {
				invoiceMsgDetails = currentMessage.details.toString();
				break;
			}
			// landed cost
			if (currentMessage.refersTo.toString().toLowerCase() == 'landedcost' && currentMessage.severity.toString().toLowerCase() == 'success') {
				landedCostMessages += currentMessage.summary.toString() + ' ' + currentMessage.details.toString() + ' ';
			} else {
				genericMsgDetails += currentMessage.details.toString() + ' ';
			}
		}
	}

	var customsDuty = new Decimal();
	var vatgst = new Decimal();
	if (svcResponse.summary && svcResponse.summary.length > 0) {
		for (i = 0; i < svcResponse.summary.length; i++) {
			var curSummaryItem = svcResponse.summary[i];
			if (curSummaryItem.taxType.toString().toLowerCase() === 'landedcost' && curSummaryItem.taxSubType.toString().toLowerCase() === 'importduty') {
				customsDuty = customsDuty.add(curSummaryItem.tax);
			} else {
				vatgst = vatgst.add(curSummaryItem.tax);
			}
		}
	}

	// Persist various values in the objects
	var txn = require('dw/system/Transaction');
	if (basket) {
		txn.wrap(
			function () {
				basket.custom.ATInvoiceMessage = invoiceMsgDetails;
				basket.custom.ATTaxDetail = JSON.stringify(taxDetailsJSON);
				basket.custom.ATLandedCost = landedCostMessages;
				basket.custom.ATCustomsDuty = customsDuty.toString();
				basket.custom.ATGenericMessage = genericMsgDetails;
				basket.custom.ATTax = vatgst.toString();
			}
		);
	}
}

/**
 * This utility is updating taxes for Reconciled Orders
 * @param {Object} requiredParamsObject contains all the service attributes required for transaction
 */
function updateTaxOnReconciledOrder( requiredParamsObject ) {

	// Setting additional gloabl attributes require for updateTaxDetails()
	uuidLineNumbersMap = requiredParamsObject.uuidLineNumbersMap;
	lineIdShipmentIdMap = requiredParamsObject.lineIdShipmentIdMap;

	// Markign the current transaction reconciled, to bypass the SalesInvoice limitation
	isReconciledTransaction = true;

	// Starting a Transaction, utilizing the existing updateTaxDetails()
	var txn = require('dw/system/Transaction');
 	txn.begin();

	updateTaxDetails (
		requiredParamsObject.basket,
		requiredParamsObject.svcResponse,
		requiredParamsObject.transactionModel,
		requiredParamsObject.orderNo
	);

	txn.commit();
}

// module exports
module.exports = {
	validateShippingAddress: validateShippingAddress,
	calculateTax: calculateTax,
	updateTaxOnReconciledOrder: updateTaxOnReconciledOrder,
	calculateTaxAndCreateInvoice: calculateTaxAndCreateInvoice
};