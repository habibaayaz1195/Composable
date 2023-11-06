
module.exports = {
    /********************************** Storefront Cartridge - int_avatax_sfra *************************/
    /** ExtLogModel Logger */
    // LogType
    LOGTYPE_PERFORMANCE: 'Performance',
    LOGTYPE_DEBUG: 'Debug',
    LOGTYPE_CONFIGAUDIT: 'ConfigAudit',
    // LogLevel
    LOGLEVEL_ERROR: 'Error',
    LOGLEVEL_EXCEPTION: 'Exception',
    LOGLEVEL_INFORMATIONAL: 'Informational',
    // ERPDetails
    ERPDetails: 'Salesforce B2C Commerce (v20.0 or later)',
    // Connector meta
    CONNECTOR_NAME: !!session.privacy.sitesource && session.privacy.sitesource == 'sgjc' ? 'SF B2C/SGJC' : 'SF B2C/SFRA',
    CLIENT_STRING: !!session.privacy.sitesource && session.privacy.sitesource == 'sgjc' ? 'client_str_SGJC' : 'client_str_SFRA',
    CONNECTOR_VERSION: '22.2.0',
    // Value constants
    ALLOWED_COUNTRIES_ARRAY: ['us', 'usa', 'canada', 'can', 'america'],
    // SVC Response
    STATUS_ERROR: 'ERROR',
    STATUS_SVC_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    CODE_AUTH_EXCEPTION: 'AuthenticationException',
    CODE_AUTH_INCOMPLETE: 'AuthenticationIncomplete',
    DOCTYPE_SALESINVOICE: 'SalesInvoice',
    // Avataxhooks
    ERROR_GENERATING_ORDER_NO: 'Error while generating order number.',
    ERROR_AVATAX_NOT_ENABLED: 'AvaTax tax calculation not enabled. Default tax calculation may be executed.',
    ERROR_AVATAX_ADDRESS_VALIDATION_NOT_ENABLED: 'AvaTax address validation not enabled. Address will not be validated.',
    ERROR_CALCULATING_TAXES: 'Error while calculating taxes.',
    // Address validation
    NO_ADDRESS_PROVIDED: "No address provided. Therefore, address can't be validated.",
    INVALID_COUNTRY: "Address validation doesn't work for this country.",
    ERROR_VALIDATING_ADDRESS: 'There was an error trying to validate shipping address.',
    // Tax calculation
    EMPTY_BASKET: 'Empty or null basket object. Skipping tax calculation.',
    EMPTY_BASKET_OR_SHIPPING_ADDRESS: "AvaTax couldn't calculate taxes. Empty basket and/or shippingaddress.",
    TAX_UPDATE_FAILED: 'Could not update taxes on Basket.',
    TAX_UPDATE_FAILED_DURING_PRICEADJUSTMENT: 'Could not update taxes during price adjustments.',
    PROBLEM_CALCULATING_TAXES: 'There was a problem calculating taxes on this Basket.',
    PROBLEM_EXTRACTING_LINE_ITEMS: 'There was a problem extracting line items from the Basket.',
    NO_CUSTOM_ATTR_FOUND: "Could't find custom attribute on Customer object. Using Customer Number.",
    BASKET_EMPTY: 'Unable to proceed with tax calculation as Basket is empty.',

    /********************************* Business Manager Cartridge - bm_avatax */
    // Certificates
    CERTCAPTURE_NOT_ENABLED: 'CertCapture is not enabled for this AvaTax account. Please ensure AvaTax credentials configured under AvaTax Settings are correct. Please contact Avalara for help.',
    ERROR_FETCHING_CUSTOMERS: 'Error fetching customers.',
    ERROR_FETCHING_CUSTOMER_DETAILS: 'Error fetching customer details.',
    AUTHENTICATION_FAILED: 'Authentication failed. Please make sure the AvaTax account credentials are configured under AvaTax Settings.',
    PROBLEM_TEST_CONNECTION: 'There was a problem checking the AvaTax connection.',
    NO_CUSTOMER_FOUND: 'No customer found.',
    PROBLEM_SENDING_CERT_INVITE: 'There was a problem sending a certificate invite.',

    // Reconciliation utility
    NO_SITE_SELECTED: 'No Site selected. Please select a site from the dropdown, and try again.',
    AMOUNT_MISMATCH: 'Amount Mismatch',
    TAX_MISMATCH: 'Tax Mismatch',
    MISSING_IN_AVATAX: 'Missing in AvaTax',
    MISSING_IN_B2C: 'Missing in B2C',
    AVATAX_NOT_ENABLED_WARNING: "AvaTax tax calculation is not enabled. Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.",
    SAVE_TO_AVATAX_NOT_ENABLED: "'Save transactions to AvaTax' is not enabled.  Some features won't work. Please enable it by navigating to 'Merchants Tools > AvaTax > AvaTax Settings', and try again.",
    PROBLEM_PROCESSING_REQUEST: 'There was a problem processing this request. Please try again.',
    ERROR_CONTACTING_AVATAX: 'Error occured while contacting AvaTax services. If the problem persists, check service configuration settings and try again.',
    SELECT_CORRECT_DATES: 'Please select appropriate date range and try again.',
    AVATAX_NOT_ENABLED: 'AvaTax is not enabled.',
    AVATAX_GETTAX_FAILED: 'AvaTax GetTax failed.',

    // Settings page
    ERROR_AUTHENTICATION_FAILED: 'Authentication failed. Please make sure the account credentials and/or environment type are correct.',
    ERROR_SAVING_FORM_DATA: 'Error while saving the form data.',
    ERROR_SAVING_AUTH_VALUES: 'An error occurred while saving authentication values.',
    PROBLEM_FFETCHING_COMPANIES_AVATAX: 'Problem while fetching companies from AvaTax account',
    EMPTY_ORDER_NO: 'Empty order no.',
    ORDER_NOT_FOUND_BM: 'Order not found in Business Manager.',
    UNSUCCESSFUL_RES_BELOW: 'Unsuccessful. Service response below:',
    SUCCESSFUL_RES_BELOW: 'Successful. Service response below:',
    PROBLEM_VOIDING_TRANSACTION: 'There was a problem voiding transaction.',
    PROBLEM_COMMITTING_TRANSACTION: 'There was a problem committing transaction.',
    COMMIT_DOCUMENT_FAILED: 'Commit document failed.',
    VOID_DOCUMENT_FAILED: 'Void document failed.',
    INVALID_COMPANY_CODE: 'Invalid company code.',
    ERROR_ENABLING_EXEMPTIONS: 'Error trying to enable/disable exemptions feature. Please try again.',
    EXEMPTIONS_NOW_ENABLED: 'Exemptions Certificates feature is now enabled on this storefront.',
    EXEMPTIONS_NOW_DISABLED: 'Exemptions Certificates feature is now disabled on this storefront.',

    /****** Certificate Management */
    CERTCAPTURE: 'certcapture',
    MANAGE_EXEMPTION_CERT: 'Manage Exemption Certificates',
    MANAGE_CERT_EXISTING_CUST: 'Manage Certificates of Existing Customers',
    COULD_NOT_FIND_COMPANY_CODE: "Couldn't figure out company ID. Please ensure Company Code is configured in AvaTax Settings.",
    CUSTOMER_NOT_FOUND: 'Customer not found.',
    ENTITY_NOT_FOUND_ERROR: 'EntityNotFoundError',
    CUSTOMER_DETAILS_UNAVAILABLE: 'Details for this customer are not present in your Avalara (AvaTax) Company.',
    PROBLEM_FETCHING_CERT_INVITES: 'Problem fetching certificate invites. Please check logs for details.',
    SERVICE_TIMED_OUT: 'Service timed out. This operation requires a larger timeout value. Please temporarily remove (/or increase) service timeout value for Administration > Operations > Services - avatax.rest.all',
    ERROR_FETCHING_CUSTOMER_DETAILS: 'There was an error fetching customer details.',
    ERROR_UPDATING_CUSTOMER_DETAILS: 'There was an error updating customer details on AvaTax.',
    ERROR_CREATING_CERTIFICATE: 'There was an error creating the certificate record on AvaTax.',
    ERROR_FETCHING_CERTIFICATE_DETAILS: 'There was an error fetching certificate details from AvaTax.'
};
