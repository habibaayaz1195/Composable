/**
 * Initializes the BM reconciliation module
 */
'use strict';

// Script Modules
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var OrderMgr = require('dw/order/OrderMgr');
var dwsystem = require('dw/system');
var dworder = require('dw/order');
var Resource = require('dw/web/Resource');

var avhelper = require('~/cartridge/scripts/avatax/avhelper');
var avaTaxClient = require('*/cartridge/scripts/avaTaxClient');
var calculateTaxHelper = require('*/cartridge/scripts/helpers/avatax/calculateTaxHelper');
var bevAlcShipmentHelper = require('*/cartridge/scripts/helpers/avatax/bevAlcShipmentHelper');
var avataxJs = require('*/cartridge/scripts/avaTax');

var jsonAddress = require('*/cartridge/scripts/lineLevelAddress.json');
var bevAlcConf = require('*/cartridge/scripts/avaBevAlcConf.json');

// Logger includes
var LOGGER = dw.system.Logger.getLogger('Avalara', 'AvaTax');

// Global variables
var avataxHelper = avhelper.avataxHelperExported;
var companyCode = '';
var params = request.httpParameterMap;
var isBevAlcEnabled = false;

// AvaTax setting preference
var settingsObject = JSON.parse(dwsystem.Site.getCurrent().getCustomPreferenceValue('ATSettings'));

// Labels
var amountMisMatch = 'Amount Mismatch';
var taxMisMatch = 'Tax Mismatch';
var missingInAvaTax = 'Missing In AvaTax';
var missingInSFCC = 'Missing In B2C';

var cStatusCompliant = Resource.msg('label.bevalc.transaction.compliant', 'avatax_constant', null);
var cStatusNonCompliant = Resource.msg('label.bevalc.transaction.non_compliant', 'avatax_constant', null);
var cStatusCancelledButCompliant = Resource.msg('label.bevalc.transaction.cnclld_compliant', 'avatax_constant', null);

/**
 * Gets the site information and settings for the current site
 * @returns {*} site info
 */
function getSiteInfo() {
	return avhelper.getSiteInfo();
}

/**
 * Utility method to be used on client side
 * @returns {*} site info for ajax methods
 */
function getSiteInfoAJAX() {
	return avhelper.getSiteInfoAJAX();
}

/**
 * Displays the reconiliation page
 */
function start() {
	var currentMenuItemId = params.CurrentMenuItemId.value;
	var menuname = params.menuname.value;
	var mainmenuname = params.mainmenuname.value;

	isBevAlcEnabled = calculateTaxHelper.verifyBevAlcEnabled();

	session.privacy.currentMenuItemId = currentMenuItemId;
	session.privacy.menuname = menuname;
	session.privacy.mainmenuname = mainmenuname;
	// Preserve the dates
	session.privacy.fromdate = '';
	session.privacy.todate = '';
	var viewObj = {
		CurrentMenuItemId: currentMenuItemId,
		menuname: menuname,
		mainmenuname: mainmenuname,
		isBevAlcEnabled: isBevAlcEnabled,
		settingsObject: settingsObject
	};

	try {
		var siteInfo = avhelper.getSiteInfo();
		viewObj.siteInfo = siteInfo;
		var avataxEnabled = settingsObject.taxCalculation;
		if (!avataxEnabled) {
			viewObj.errormsg = "AvaTax tax calculation is not enabled. Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.";
		} else if (!settingsObject.saveTransactions) {
			viewObj.errormsg = "'Save transactions to AvaTax' is not enabled.  Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.";
		}
	} catch (e) {
		viewObj.errormsg = 'No Site selected. Please select a site from the dropdown, and try again.';
	}
	app.getView(viewObj).render('/avatax/ordersreconcile');
}

/**
 * Reconciles the order documents from SFCC and AvaTax
 * @param {*} sfccOrders sfccOrders
 * @param {*} avaTax avaTax
 * @returns {*} reconciled transaction
 */
function reconcileTransactions(sfccOrders, avaTax) {
	var countReport = {};
	var amountOrTaxMisMatchCount = 0;
	var missingInAvaTaxCount = 0;
	var missingInSFCCCount = 0;
	var nonCompliantCount = 0;
	var cancelledCompliantCount = 0;
	var result = [];
	var mapSFCCOrders = new dw.util.SortedMap();

	for (var i = 0; i < sfccOrders.size(); i++) {

		mapSFCCOrders.put(sfccOrders[i].orderNo, sfccOrders[i]);
		var avaTrans = avaTax.get(sfccOrders[i].orderNo);
		var rStatus = '-';
		var cStatus = '-';
		var avTotalAmt;
		var avTotalTax;
		var avCurrency;

		// Order Status value 6 -> CANCELLED
		if( isBevAlcEnabled ) {
			var orderStatus = sfccOrders[i].status;
			var orderVerificationStatus = sfccOrders[i].custom.ATVerificationStatus;

			// Skip the orders if:
			// 1. Compliant and Not Cancelled
			// 2. Not Compliant and Cancelled
			if((orderVerificationStatus == cStatusCompliant && orderStatus != 6) || (orderVerificationStatus != cStatusCompliant && orderStatus == 6)) {
				continue;
			}

			if(sfccOrders[i].custom.ATVerificationStatus == cStatusNonCompliant ) {
				cStatus = cStatusNonCompliant;
				nonCompliantCount++;
			} else if (sfccOrders[i].custom.ATVerificationStatus == cStatusCompliant && sfccOrders[i].status == 6) {
				cStatus = cStatusCancelledButCompliant;
				cancelledCompliantCount++;
			}
		}

		if (avaTrans) {
			if (sfccOrders[i].totalNetPrice.value !== avaTrans.totalAmount) {
				rStatus = amountMisMatch;
				amountOrTaxMisMatchCount++;
			} else if (sfccOrders[i].totalTax.value !== avaTrans.totalTax) {
				rStatus = taxMisMatch;
				amountOrTaxMisMatchCount++;
			}
			avTotalAmt = avaTrans.totalAmount;
			avTotalTax = avaTrans.totalTax;
			avCurrency = avaTrans.currencyCode;
		} else {
			rStatus = missingInAvaTax;
			missingInAvaTaxCount++;
			avTotalAmt = '';
			avTotalTax = '';
		}

		if (rStatus !== '-' || cStatus !== '-') {

			var oDate = sfccOrders[i].creationDate;
			var odt = (BigInt(new dw.util.Decimal(oDate.getFullYear()))).toString() +
					'-' + BigInt((new dw.util.Decimal(oDate.getMonth() + 1))) +
					'-' + BigInt((new dw.util.Decimal(oDate.getDate()))).toString().padStart(2,'0');

			result.push({
				orderNo: sfccOrders[i].orderNo,
				orderDate: odt,
				orderStatus: sfccOrders[i].status,
				orderTotalAmt: sfccOrders[i].totalNetPrice.value,
				orderTax: sfccOrders[i].totalTax.value,
				avTotalAmt: avTotalAmt,
				avTotalTax: avTotalTax,
				avCurrencyCode: avCurrency,
				reconciliationStatus: rStatus,
				verificationStatus: cStatus
			});
		}
	}

	for (i = 0; i < avaTax.keySet().toArray().length; i++) {
		var docCode = avaTax.keySet().toArray()[i];
		var avataxDoc = avaTax.get(docCode);
		var order = mapSFCCOrders.get(docCode);
		if (!order) {
			result.push({
				orderNo: avataxDoc.code,
				orderDate: avataxDoc.date,
				orderStatus: '-',
				orderTotalAmt: '-',
				orderTax: '-',
				avTotalAmt: avataxDoc.totalAmount,
				avTotalTax: avataxDoc.totalTax,
				avCurrencyCode: avataxDoc.currencyCode,
				reconciliationStatus: missingInSFCC,
				verificationStatus: cStatus
			});
			missingInSFCCCount++;
		}
	}
	countReport = {
		amountOrTaxMisMatchCount: amountOrTaxMisMatchCount,
		missingInAvaTaxCount: missingInAvaTaxCount,
		missingInSFCCCount: missingInSFCCCount,
		nonCompliantCount: nonCompliantCount,
		cancelledCompliantCount: cancelledCompliantCount
	};
	return {
		orders: result,
		countReport: countReport
	};
}

/**
 * Fetches order documents from SFCC and AvaTax
 * @param {*} params collection of orders
 */
function getOrders() {
	var currentMenuItemId = session.privacy.currentMenuItemId;
	var menuname = session.privacy.menuname;
	var mainmenuname = session.privacy.mainmenuname;
	var siteInfo = null;
	var orders = null;
	var ordersList = null;
	var ordersOnAccount = null;
	var reconcileResults = null;
	var countReport = null;
	var errormsg = null;
	var reconciledOrders = null;
	var viewObj = null;

	var success = true;

	var siteInfo = getSiteInfo();

	isBevAlcEnabled = calculateTaxHelper.verifyBevAlcEnabled();

	try {
		var avataxEnabled = settingsObject.taxCalculation;
		companyCode = settingsObject.companyCode;
		if (!avataxEnabled) {
			success = false;
			viewObj = {
				errormsg: "AvaTax tax calculation is not enabled. Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.",
				CurrentMenuItemId: currentMenuItemId,
				menuname: menuname,
				mainmenuname: mainmenuname,
				settingsObject: settingsObject
			};
		} else if (!settingsObject.saveTransactions) {
			success = false;
			viewObj = {
				errormsg: "'Save transactions to AvaTax' is not enabled.  Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.",
				CurrentMenuItemId: currentMenuItemId,
				menuname: menuname,
				mainmenuname: mainmenuname,
				settingsObject: settingsObject
			};
		} else {
			siteInfo = getSiteInfo();
		}
	} catch (e) {
		success = false;
		viewObj = {
			errormsg: 'There was a problem processing this request. Please try again.',
			CurrentMenuItemId: currentMenuItemId,
			menuname: menuname,
			mainmenuname: mainmenuname,
			settingsObject: settingsObject
		};
	}
	if (success) {
		try {
			// Retrieve selected dates
			var fromdate = params.fromdate.value.toString();
			var todate = params.todate.value.toString();

			if (empty(fromdate) && empty(todate)) {
				var date = new Date();

				var today = date;
				var todayMonth = today.getUTCMonth() + 1;
				var todayDate = today.getUTCDate();
				var todayYear = today.getUTCFullYear();
				var todayDate = todayMonth + '/' + todayDate + '/' + todayYear;

				// 30 days back
				var frDay = new Date(new Date() - (30 * 24 * 60 * 60 * 1000)); // date 30 days ago
				var frMonth = frDay.getUTCMonth() + 1;
				var frDate = frDay.getUTCDate();
				var frYear = frDay.getUTCFullYear();
				var frDate = frMonth + '/' + frDate + '/' + frYear;

				fromdate = frDate;
				todate = todayDate;

			}
			// save dates to make them accessible on ISML
			session.privacy.fromdate = fromdate;
			session.privacy.todate = todate;
			if (empty(fromdate) && empty(todate)) {
				// AvaTax getTransactions API has changed to display only last 30 days transactions. Still keeping this piece
				orders = OrderMgr.queryOrders('orderNo != {0}', 'creationDate desc', '*');
				ordersOnAccount = avaTaxClient.getTransactions(companyCode); // yyyy-mm-dd
				ordersList = orders.asList();
				orders.close();
				if (!ordersOnAccount.ERROR) {
					reconcileResults = reconcileTransactions(ordersList, ordersOnAccount.values);
					reconciledOrders = reconcileResults.orders;
					countReport = reconcileResults.countReport;
				} else {
					errormsg = 'Error occured while contacting AvaTax services. If the problem persists, check service configuration settings and try again.';
				}
			} else if (empty(fromdate) || empty(todate)) {
				errormsg = 'Please select appropriate date range and try again.';
			} else {
				var fromDateArray = [fromdate.split('/')[0], fromdate.split('/')[1], fromdate.split('/')[2]];
				var toDateArray = [todate.split('/')[0], todate.split('/')[1], todate.split('/')[2]];
				var fdStr = fromDateArray[2] + '-' + fromDateArray[0] + '-' + fromDateArray[1]; // yyyy-mm-dd
				var tdStr = toDateArray[2] + '-' + toDateArray[0] + '-' + toDateArray[1]; // yyyy-mm-dd
				var td1 = new Date((new Date(toDateArray[2], toDateArray[0], toDateArray[1])).getTime() + (1 * 24 * 60 * 60 * 1000));
				var tdStrSFCC = td1.getYear() + '-' + td1.getMonth() + '-' + td1.getDate();

				if( isBevAlcEnabled ) {
					orders = OrderMgr.queryOrders('creationDate >= {0} AND creationDate <= {1} AND status != {2}', 'creationDate desc', fdStr, tdStrSFCC, 8);
				} else {
					orders = OrderMgr.queryOrders('creationDate >= {0} AND creationDate <= {1} AND status != {2} AND status != {3}', 'creationDate desc', fdStr, tdStrSFCC, 8, 6);
				}

				ordersList = orders.asList();
				orders.close();
				ordersOnAccount = avaTaxClient.getTransactions(companyCode, fdStr, tdStr); // yyyy-mm-dd
				if (!ordersOnAccount.ERROR) {
					reconcileResults = reconcileTransactions(ordersList, ordersOnAccount.values);
					reconciledOrders = reconcileResults.orders;
					countReport = reconcileResults.countReport;
				} else {
					errormsg = 'Error occured while contacting AvaTax services. If the problem persists, check service configuration settings and try again.';
				}
			}
			viewObj = {
				orders: reconciledOrders,
				siteInfo: siteInfo,
				CurrentMenuItemId: currentMenuItemId,
				menuname: menuname,
				mainmenuname: mainmenuname,
				countReport: countReport,
				errormsg: errormsg,
				isBevAlcEnabled: isBevAlcEnabled,
				settingsObject: settingsObject
			};
		} catch (e) {
			LOGGER.warn('Problem while contacting AvaTax. Please check the logs for error details. ' + e.message);
			viewObj = {
				errormsg: 'Problem while contacting AvaTax. Please check the logs for error details.',
				CurrentMenuItemId: currentMenuItemId,
				siteInfo: siteInfo,
				menuname: menuname,
				mainmenuname: mainmenuname,
				settingsObject: settingsObject
			};
		}
	}
	app.getView(viewObj).render('/avatax/ordersreconcile');
}

var CreateTransactionModel = require('*/cartridge/models/createTransactionModel');
var counter = 0;

/**
 * Reconcile selected orders
 */
function reconcile() {
	var r = require('~/cartridge/scripts/util/Response');
	var orderNo = params.orderno.value;
	if (!settingsObject.taxCalculation) {
		LOGGER.warn('AvaTax | AvaTax not enabled for this site. File - avaTax.js~calculateTax');
		r.renderJSON({
			ERROR: true,
			fatalmsg: 'AvaTax is disabled for this site.'
		});
		return;
	}
	if (!orderNo) {
		r.renderJSON({
			ERROR: true
		});
		return;
	}
	try {
		var basket = OrderMgr.getOrder(orderNo.toString());
		var uuidLineNumbersMap = new dw.util.SortedMap();
		var lineIdShipmentIdMap = new dw.util.SortedMap();
		var svcResponse = {};
		var transactionModel = new CreateTransactionModel.CreateTransactionModel();
		var customerTaxId = !empty(customer.profile) ? customer.profile.taxID : null; // Tax ID of the customer
		var isSellerImporterOfRecord = !empty(customer.profile) ? customer.profile.custom.ATisSellerImporterOfRecord : false;
		var lines = []; // Lines array
		var saveTransactionsToAvatax = avataxHelper.prototype.saveTransactionsToAvatax(); // Save transaction preference in custom preferences
		var commitTransactionsToAvatax = avataxHelper.prototype.commitTransactionsToAvatax(); // Commit transactions preference

		isBevAlcEnabled= calculateTaxHelper.verifyBevAlcEnabled();
		
		// Extract all line item objects from basket 
		var allLineItemsObj = calculateTaxHelper.getAllLineItems(basket);
		lines = allLineItemsObj.lines;
        uuidLineNumbersMap = allLineItemsObj.uuidLineNumbersMap;
        lineIdShipmentIdMap = allLineItemsObj.lineIdShipmentIdMap;

		var li;
		var line;

		// Lines array - END
		// Construct a transaction object
		if (orderNo) {
			transactionModel.code = orderNo;
			//  If commit document not enabled in site preferences, type is SalesOrder
			if (saveTransactionsToAvatax) {
				transactionModel.type = transactionModel.type.C_SALESINVOICE;
			} else {
				transactionModel.type = transactionModel.type.C_SALESORDER;
			}
		} else {
			r.renderJSON({
				ERROR: true,
				msg: 'Order number empty',
				orderno: orderNo
			});
			return;
		}

		transactionModel.lines = lines;
		transactionModel.commit = !!(commitTransactionsToAvatax && orderNo);
		transactionModel.companyCode = avataxHelper.prototype.getCompanyCode();
		transactionModel.date = basket.creationDate;
		transactionModel.salespersonCode = null;
		transactionModel.customerCode = empty(basket.getCustomerEmail()) ? 'so-cust-code' : basket.getCustomerEmail();
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

		// ********* 	Call the tax adjustment service 	********** //
		svcResponse = avaTaxClient.createOrAdjustTransaction('', {
			createTransactionModel: transactionModel
		});

		// If AvaTax returns error, set taxes to Zero
		if (svcResponse.statusCode === 'ERROR') {
			var errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
			// If error code in response is 'missingline', update logs
			if (svcResponse.errorMessage.error.code) {
				LOGGER.warn("AvaTax | AvaTax couldn't calculate taxes. Empty basket or empty shipping address. Basket details - " + basket);
				errormsg = 'Empty basket or empty shipping address';
			}
			r.renderJSON({
				ERROR: true,
				msg: errormsg,
				orderno: orderNo
			});
			return;
		}
		// If taxes cannot be calculated
		if (svcResponse.errorMessage) {
			errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
			r.renderJSON({
				ERROR: true,
				msg: errormsg,
				orderno: orderNo
			});
			return;
		}
		if (!svcResponse.statusCode) {

			// Update Tax details on Order, received from Service
			avataxJs.updateTaxOnReconciledOrder({
				basket,
				svcResponse,
				transactionModel,
				orderNo,
				uuidLineNumbersMap,
				lineIdShipmentIdMap
			});

			r.renderJSON({
				ERROR: false,
				orderno: orderNo,
				taxAmt: svcResponse.totalTax,
				totalAmt: svcResponse.totalAmount
			});
			return;
		}
		errormsg = svcResponse.errorMessage.error.details[0].message + ' Details - ' + svcResponse.errorMessage.error.details[0].description;
		r.renderJSON({
			ERROR: true,
			msg: errormsg,
			orderno: orderNo
		});
		return;
	} catch (e) {
		LOGGER.warn('[Avatax gettax failed - {0}. File - AvataxBM.js]', e.message);
		r.renderJSON({
			ERROR: true,
			msg: e.message
		});
		return;
	}
}

/**
 * Method to perform Reverify/Override Shipment action on single order
 * @returns an object containing service response for Reverify/Override action
 */
function reverifyOrOverride() {

	var r = require('~/cartridge/scripts/util/Response');
	var orderNo = params.orderno.value;
	var isOverride = params.isOverride.value === 'true';

	if (!settingsObject.taxCalculation) {
		LOGGER.warn('AvaTax | AvaTax not enabled for this site. File - avaTax.js~calculateTax');
		r.renderJSON({
			ERROR: true,
			fatalmsg: 'AvaTax is disabled for this site.'
		});
		return;
	}
	if (!orderNo) {
		r.renderJSON({
			ERROR: true,
			msg: 'Order number empty',
			orderno: orderNo
		});
		return;
	}
	try {
		var responseObj = bevAlcShipmentHelper.registerOrOverrideShipment(null, orderNo, isOverride);
		r.renderJSON(responseObj);
		return;
	} catch (e) {
		LOGGER.warn('[Avatax gettax failed - {0}. File - AvataxBM.js]', e.message);
		r.renderJSON({
			ERROR: true,
			msg: e.message
		});
		return;
	}
}

/**
 * Method to perform Cancel Shipment action on single order
 * @returns an object containing service response for Cancel action
 */
function cancel() {
	var r = require('~/cartridge/scripts/util/Response');
	var orderNo = params.orderno.value;
	var isCompliant = params.isCompliant;

	if (!settingsObject.taxCalculation) {
		LOGGER.warn('AvaTax | AvaTax not enabled for this site. File - avaTax.js~calculateTax');
		r.renderJSON({
			ERROR: true,
			fatalmsg: 'AvaTax is disabled for this site.'
		});
		return;
	}

	if (!orderNo) {
		r.renderJSON({
			ERROR: true,
			msg: 'Order number empty',
			orderno: orderNo
		});
		return;
	}

	try {
		var responseObj = bevAlcShipmentHelper.cancelOrder(orderNo, isCompliant);
		r.renderJSON(responseObj);
		return;
	} catch (e) {
		LOGGER.warn('[Avatax gettax failed - {0}. File - AvataxBM.js]', e.message);
		r.renderJSON({
			ERROR: true,
			msg: e.message
		});
		return;
	}
}

// modules exports
exports.Start = guard.ensure(['https'], start);
exports.GetOrders = guard.ensure(['https'], getOrders);
exports.Reconcile = guard.ensure(['https', 'post'], reconcile);
exports.Reverify = guard.ensure(['https', 'post'], reverifyOrOverride);
exports.Cancel = guard.ensure(['https', 'post'], cancel);
exports.GetSiteInfoAJAX = guard.ensure(['https'], getSiteInfoAJAX);