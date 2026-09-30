export type FormState = {
  message?: string;
  success?: string;
  fields?: Record<string, string>;
  email?: string;
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};
