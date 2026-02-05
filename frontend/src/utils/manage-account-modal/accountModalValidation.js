import { checkName, checkAddressField, checkNumber } from '../validationRules';

export const validateClassRegistrationStep = (formData) => {
  const errors = {};

  const nameError = checkName(formData.sectionName, "Section Name");
  if (nameError) errors.sectionName = nameError;

  // 2. Class Schedule (Dropdown)
  // We use checkAddressField because it checks if the value is not empty/null
  const scheduleError = checkAddressField(formData.classSchedule, "Class Schedule");
  if (scheduleError) errors.classSchedule = scheduleError;

  // 3. Max Capacity (Number)
  const capacityError = checkNumber(formData.maxCapacity, "Max Capacity");
  if (capacityError) errors.maxCapacity = capacityError;

  // 4. Assigned Teacher (Dropdown)
  const teacherError = checkAddressField(formData.assignedTeacher, "Teacher assignment");
  if (teacherError) errors.assignedTeacher = teacherError;

  // Description is usually optional, so we skip it. 
  // If you want it required, add: checkAddressField(formData.description, "Description")

  return errors;
};