export interface User {
  id: number;
  name: string;
  email: string;
  password?: string; // enviado no POST, nunca armazenado localmente
  role?: string;
  organization?: string;
}
