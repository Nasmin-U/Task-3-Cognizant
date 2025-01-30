// Logic for the Customer fields on the Case form

// Main script for Case Form
function onCaseFormLoad(executionContext) {
  const formContext = executionContext.getFormContext();
  setupFieldEvents(formContext);
  onCustomerChange(executionContext);
}

// Setup field event handlers
function setupFieldEvents(formContext) {
  formContext.getAttribute("customerid")?.addOnChange(onCustomerChange);
  formContext
    .getAttribute("primarycontactid")
    ?.addOnChange(onPrimaryContactChange);
}

/* 
Handle changes in the Customer field (customerid)
If no customer is selected, hide the Contact fields
Otherwise, fetch the customer details based on the customer type 
*/
function onCustomerChange(executionContext) {
  const formContext = executionContext.getFormContext();
  const customer = getCustomer(formContext);

  if (!customer) {
    hideContactFields(formContext);
    return;
  }

  if (customer.type === "account") {
    handleAccountCustomer(formContext, customer.id);
  } else {
    handleContactCustomer(formContext, customer.id);
  }
}

/*
Handle changes in the Primary Contact field (primarycontactid)
Fetch contact details if a contact is selected; otherwise, clear the fields
*/
function onPrimaryContactChange(executionContext) {
  const formContext = executionContext.getFormContext();
  const selectedContact = getSelectedContactId(formContext);

  selectedContact
    ? fetchContactDetails(formContext, selectedContact)
    : clearContactFields(formContext);
}

/*
Handle Account-type customer
Show the Contact field and fetch the primary contact details
If no contact is selected, fetch the primary contact from the account 
*/
function handleAccountCustomer(formContext, accountId) {
  toggleFieldVisibility(formContext, "primarycontactid", true);
  const selectedContact = getSelectedContactId(formContext);

  selectedContact
    ? fetchContactDetails(formContext, selectedContact)
    : fetchPrimaryContactFromAccount(formContext, accountId);
}

// Handle Contact-type customer
function handleContactCustomer(formContext, contactId) {
  hideContactFields(formContext);
  fetchContactDetails(formContext, contactId);
}

/*
Fetch the primary contact from an account record
If a primary contact is found, fetch the contact details; otherwise, clear the fields
*/
function fetchPrimaryContactFromAccount(formContext, accountId) {
  fetchRecord(
    "account",
    accountId,
    "?$select=_primarycontactid_value",
    (account) => {
      const primaryContactId = account._primarycontactid_value;
      primaryContactId
        ? fetchContactDetails(formContext, primaryContactId)
        : clearContactFields(formContext);
    }
  );
}

// Fetch contact details (email and phone) based on the contact ID
function fetchContactDetails(formContext, contactId) {
  fetchRecord(
    "contact",
    contactId,
    "?$select=emailaddress1,mobilephone",
    (contact) => {
      updateField(formContext, "emailaddress", contact.emailaddress1);
      updateField(formContext, "crf7d_mobilephone", contact.mobilephone);
    }
  );
}

// Utility: Get selected contact ID from form
function getSelectedContactId(formContext) {
  const selectedContact = formContext
    .getAttribute("primarycontactid")
    ?.getValue();
  return selectedContact ? stripGuid(selectedContact[0].id) : null;
}

// Utility: Get customer ID and type from the Customer field
function getCustomer(formContext) {
  const customer = formContext.getAttribute("customerid")?.getValue();
  if (customer) {
    return {
      id: stripGuid(customer[0].id),
      type: customer[0].entityType,
    };
  } else {
    return null;
  }
}

// Utility: Clear and hide contact-related fields
function clearContactFields(formContext) {
  updateField(formContext, "emailaddress", null);
  updateField(formContext, "crf7d_mobilephone", null);
}

// Utility: Hide all contact-related fields
function hideContactFields(formContext) {
  toggleFieldVisibility(formContext, "primarycontactid", false);
  clearContactFields(formContext);
}
