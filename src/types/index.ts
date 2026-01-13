export type Priority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Todo' | 'In Progress' | 'Done';
export type ProjectStatus = 'Active' | 'Completed' | 'On Hold' | 'To Quote';
export type QuoteStatus = 'W trakcie' | 'Zaakceptowana' | 'Niezaakceptowana' | 'Do zmiany';
export type NotificationType = 'task_deadline' | 'order_status' | 'task_update' | 'task_created';

export interface Client {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  color?: string | null;
  categoryId?: number;
  isDeleted?: number; // 0 or 1
  deletedAt?: Date;
}

export interface ClientCategory {
  id?: number;
  name: string;
}

export interface Project {
  id?: number;
  clientId: number;
  parentProjectId?: number;
  supplierIds?: number[];
  employeeIds?: number[];
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  totalValue: number; // Revenue
  quoteDueDate?: Date;
  quoteStatus?: QuoteStatus;
  quotationTitle?: string;
  acceptedDate?: Date;
  createdAt: Date;
  address?: string;
  lat?: number;
  lng?: number;
  colorMarker?: string | null; // Color marker for visual identification
  isDeleted?: number;
  deletedAt?: Date;
}

export interface ExtendedProject extends Project {
  client?: Client;
  suppliers?: Supplier[];
  employees?: Employee[];
  subProjects?: ExtendedProject[];
  parentProject?: ExtendedProject;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id?: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: Date;
  subtasks?: Subtask[];
  checklist?: { id: string; text: string; completed: boolean }[];
  createdAt: Date;
  isDeleted?: number;
  deletedAt?: Date;
}

export interface Expense {
  id?: number;
  projectId: number;
  title: string;
  amount: number; // Gross amount
  netAmount?: number;
  taxRate?: number;
  type: 'Employee' | 'Purchase'; // Labor vs Material
  date: Date;
  orderId?: number;
  isDeleted?: number;
  deletedAt?: Date;
}

export interface Resource {
  id?: number;
  projectId: number;
  name: string;
  type: 'File' | 'Image' | 'Link';
  content: string | Blob; // URL for link, Blob for file/image (stored in IndexedDB)
  folder?: string; // Virtual folder name
  createdAt: Date;
  isDeleted?: number;
  deletedAt?: Date;
}
export interface Supplier {
  id?: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  categoryId?: number;
  isDeleted?: number;
  deletedAt?: Date;
}

export interface SupplierCategory {
  id?: number;
  name: string;
}

export interface QuotationItem {
  id?: number;
  projectId: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  margin?: number;
  priceWithMargin?: number;
  total: number;
  section?: string;
}
export interface Order {
  id?: number;
  projectId: number;
  taskId?: number;
  supplierId?: number;
  title: string;
  amount: number; // Gross amount
  netAmount?: number;
  taxRate?: number;
  status: 'Pending' | 'Ordered' | 'Delivered';
  date: Date;
  quantity?: number;
  unit?: string;
  addedToWarehouse?: boolean;
  notes?: string;
  url?: string;
  isDeleted?: number;
  deletedAt?: Date;
}

export interface CostEstimateItem {
  id?: number;
  projectId: number;
  section: string;
  description: string;
  quantity: number;
  unit: string;
  unitNetPrice: number;
  taxRate: number;
}

export interface OrderTemplate {
  id?: number;
  title: string;
  defaultAmount: number;
}

export interface Notification {
  id?: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  relatedId?: number;
  relatedType?: 'task' | 'order' | 'project';
}

export interface Employee {
  id?: number;
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  email: string;
  rate: number;
  status: 'Active' | 'Inactive';
  isDeleted?: number;
  employeePermissions?: EmployeePermission[];
}

export interface EmployeePermission {
  id: number;
  employeeId: number;
  name: string;
  issueDate: Date;
  expiryDate?: Date | null;
  number?: string | null;
  createdAt?: Date;
}

export interface Tool {
  id?: number;
  name: string;
  brand: string;
  model?: string;
  serialNumber: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Lost';
  purchaseDate: Date;
  price: number;
  categoryId?: number;
  category?: ToolCategory;
  assignedEmployees?: Employee[]; // Many-to-Many relation
  lastInspectionDate?: Date;
  inspectionExpiryDate?: Date;
  protocolNumber?: string;
  isDeleted?: number;
}

export interface ToolCategory {
  id?: number;
  name: string;
}

export interface ProtocolData {
  general: { a: string, b: string, c: string, d: string };
  disassembly: { a: string, b: string, c: string, d: string };
  protection: { a: string, b: string };
  result: string;
  comments: string;
  date: Date;
  place: string;
  inspectorName: string;
  validityMonths?: number;
  nextInspectionDate?: Date;
}

export interface WarehouseItem {
  id?: number;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  minQuantity?: number;
  category?: string;
  location?: string;
  lastUpdated: Date;
  isDeleted?: number;
}

export interface WarehouseHistoryItem {
  id?: number;
  itemId: number;
  type: 'IN' | 'OUT';
  quantity: number;
  date: Date;
  reason?: string;
  userId?: number; // Optional: ID of the user who performed the action
}
