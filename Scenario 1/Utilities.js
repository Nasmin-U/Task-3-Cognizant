// Utility functions for Case Logic forms

/**
 * Removes curly braces from a GUID string
 * @param {string} guid - The GUID string to process
 * @returns {string} - The GUID without curly braces
 */
function stripGuid(guid) {
  return guid.replace(/[{}]/g, "");
}

/**
 * Fetches a record from the Web API
 * @param {string} entityName - The logical name of the entity to fetch
 * @param {string} recordId - The GUID of the record to fetch
 * @param {string} query - The OData query string to specify fields to retrieve
 * @param {Function} onSuccess - Callback function to handle the fetched record
 */
function fetchRecord(entityName, recordId, query, onSuccess) {
  Xrm.WebApi.retrieveRecord(entityName, recordId, query)
    .then(onSuccess)
    .catch((error) => {
      const errorMessage = `Error fetching ${entityName} with ID ${recordId}: ${error.message}`;
      Xrm.Navigation.openAlertDialog({ text: errorMessage });
    });
}

/**
 * Toggles the visibility of a field on the form
 * @param {object} formContext - The form context to interact with
 * @param {string} fieldName - The logical name of the field to show or hide
 * @param {boolean} isVisible - Whether the field should be visible
 */
function toggleFieldVisibility(formContext, fieldName, isVisible) {
  formContext.getControl(fieldName)?.setVisible(isVisible);
}

/**
 * Updates the value of a field and toggles its visibility
 * @param {object} formContext - The form context to interact with
 * @param {string} fieldName - The logical name of the field to update
 * @param {*} value - The value to set for the field
 */
function updateField(formContext, fieldName, value) {
  const isValueDefined = value !== undefined && value !== null;
  formContext.getAttribute(fieldName)?.setValue(isValueDefined ? value : null);
  toggleFieldVisibility(formContext, fieldName, isValueDefined);
}
