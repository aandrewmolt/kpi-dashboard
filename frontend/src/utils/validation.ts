export interface ValidationRule {
  validate: (value: any, formData?: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string;
}

// Common validation rules
export const required = (fieldName: string): ValidationRule => ({
  validate: (value: any) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  },
  message: `${fieldName} is required`,
});

export const minLength = (length: number, fieldName: string): ValidationRule => ({
  validate: (value: string) => value.length >= length,
  message: `${fieldName} must be at least ${length} characters`,
});

export const maxLength = (length: number, fieldName: string): ValidationRule => ({
  validate: (value: string) => value.length <= length,
  message: `${fieldName} must not exceed ${length} characters`,
});

export const isEmail = (): ValidationRule => ({
  validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  message: 'Please enter a valid email address',
});

export const isDate = (fieldName: string): ValidationRule => ({
  validate: (value: string) => !isNaN(Date.parse(value)),
  message: `${fieldName} must be a valid date`,
});

export const isAfterDate = (dateField: string, fieldName: string): ValidationRule => ({
  validate: (value: string, formData: any = {}) => {
    const date1 = new Date(value);
    const date2 = new Date(formData[dateField]);
    return date1 > date2;
  },
  message: `${fieldName} must be after ${dateField}`,
});

export const isNumber = (fieldName: string): ValidationRule => ({
  validate: (value: any) => !isNaN(Number(value)),
  message: `${fieldName} must be a number`,
});

export const isPositive = (fieldName: string): ValidationRule => ({
  validate: (value: number) => value > 0,
  message: `${fieldName} must be a positive number`,
});

export const noWhitespace = (fieldName: string): ValidationRule => ({
  validate: (value: string) => !/\s/.test(value),
  message: `${fieldName} cannot contain whitespace`,
});

// Main validation function
export const validateForm = (
  data: { [key: string]: any },
  rules: ValidationRules
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((field) => {
    const fieldRules = rules[field];
    for (const rule of fieldRules) {
      if (!rule.validate(data[field], data)) {
        errors[field] = rule.message;
        break;
      }
    }
  });

  return errors;
};

// Helper to check if form has errors
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

// Date validation helpers
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

// Custom validation rules for specific forms
export const operatorValidationRules: ValidationRules = {
  name: [
    required('Name'),
    minLength(2, 'Name'),
    maxLength(50, 'Name'),
  ],
};

export const padValidationRules: ValidationRules = {
  name: [
    required('Name'),
    minLength(2, 'Name'),
    maxLength(50, 'Name'),
  ],
  location: [
    required('Location'),
    maxLength(100, 'Location'),
  ],
  operator_id: [
    required('Operator'),
  ],
};

export const jobValidationRules: ValidationRules = {
  pad_id: [required('Pad')],
  start_date: [
    required('Start date'),
    isDate('Start date'),
  ],
};

export const incidentValidationRules: ValidationRules = {
  type_id: [required('Incident type')],
  description: [
    required('Description'),
    minLength(10, 'Description'),
    maxLength(500, 'Description'),
  ],
  start_time: [
    required('Start time'),
    isDate('Start time'),
  ],
  end_time: [
    required('End time'),
    isDate('End time'),
  ],
  fault: [required('Fault category')],
}; 