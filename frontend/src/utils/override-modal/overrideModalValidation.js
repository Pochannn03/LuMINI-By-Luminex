import { checkName, checkAddressField, checkFile } from '../validationRules';

// /**
//  * Validates the Emergency Override Form
//  * @param {Object} formData - Current form state (studentId, guardianId, etc.)
//  * @param {Boolean} isRegistered - Whether the "Registered" tab is active
//  * @param {File|null} profileImage - The cropped ID photo blob
//  */
export const validateOverrideForm = (formData, isRegistered, profileImage) => {
  const errors = {};

  const studentError = checkAddressField(formData.studentId, "Student selection");
  if (studentError) errors.studentId = studentError;

  if (isRegistered) {
    const guardianError = checkAddressField(formData.guardianId, "Guardian authorization");
    if (guardianError) errors.guardianId = guardianError;
  } else {
    const guestNameError = checkName(formData.manualGuardianName, "Guest Guardian Name");
    if (guestNameError) errors.manualGuardianName = guestNameError;

    const fileError = checkFile(profileImage, "ID Verification photo");
    if (fileError) errors.profileImage = fileError;
  }

  return errors;
};