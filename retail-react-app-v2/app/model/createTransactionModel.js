
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
  }
  
  function formatDate(date) {
    return [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
    ].join('-');
  }
  
//   // 👇️ 2023-01-13 (yyyy-mm-dd)
//   console.log(formatDate(new Date()));
  
//   //  👇️️ 2025-05-09 (yyyy-mm-dd)
//   console.log(formatDate());
  

function getTransaction(basket){
this.date= formatDate(new Date(basket.creationDate))
this.customerCode = basket.customerInfo.customerNo;
this.quantity = basket.productItems.quantity;
this.description= basket.productItems.productName;
this.companyCode = 'DEFAULTS';
this.salespersonCode = '';
this.customerUsageType = '';
this.discount = '';
this.purchaseOrderNo = '';
this.exemptionNo = '';
this.addresses = null;
this.parameters = null;
this.referenceCode = '';
this.reportingLocationCode = '';
this.commit = false;
this.batchCode = '';
this.taxOverride = null;
this.currencyCode = basket.currency;


}

module.exports = {getTransaction:getTransaction}
