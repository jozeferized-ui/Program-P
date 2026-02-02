/**
 * @file index.ts
 * @description Definicje typów TypeScript dla całej aplikacji
 * 
 * Zawiera:
 * - Typy podstawowe (statusy, priorytety)
 * - Interfejsy dla wszystkich encji bazodanowych
 * - Typy rozszerzające (z relacjami)
 * - Typy specjalne (protokoły, magazyn)
 * 
 * @module types
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPY PODSTAWOWE (ENUMY)
// ─────────────────────────────────────────────────────────────────────────────

/** Priorytet zadania */
export type Priority = 'Low' | 'Medium' | 'High';

/** Status zadania */
export type TaskStatus = 'Todo' | 'In Progress' | 'Done';

/** Status projektu */
export type ProjectStatus = 'Active' | 'Completed' | 'On Hold' | 'To Quote';

/** Status wyceny */
export type QuoteStatus = 'W trakcie' | 'Zaakceptowana' | 'Niezaakceptowana' | 'Do zmiany';

/** Typ powiadomienia */
export type NotificationType = 'task_deadline' | 'order_status' | 'task_update' | 'task_created';

// ─────────────────────────────────────────────────────────────────────────────
// KLIENCI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Klient/kontrahent
 */
export interface Client {
  id?: number;
  /** Nazwa firmy lub imię i nazwisko */
  name: string;
  email?: string;
  phone?: string;
  /** Dodatkowe notatki */
  notes?: string;
  /** Kolor oznaczenia (hex) */
  color?: string | null;
  /** ID kategorii klienta */
  categoryId?: number;
  /** Soft delete: 0=aktywny, 1=usunięty */
  isDeleted?: number;
  deletedAt?: Date;
}

/**
 * Kategoria klientów
 */
export interface ClientCategory {
  id?: number;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJEKTY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Projekt budowlany/instalacyjny
 */
export interface Project {
  id?: number;
  /** ID klienta (wymagane) */
  clientId: number;
  /** ID projektu nadrzędnego (dla podprojektów) */
  parentProjectId?: number;
  /** Tablica ID dostawców przypisanych do projektu */
  supplierIds?: number[];
  /** Tablica ID pracowników przypisanych do projektu */
  employeeIds?: number[];
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  /** Wartość projektu (przychód brutto) */
  totalValue: number;
  /** Termin wyceny */
  quoteDueDate?: Date;
  /** Status wyceny */
  quoteStatus?: QuoteStatus;
  /** Tytuł dokumentu wyceny */
  quotationTitle?: string;
  /** Data akceptacji wyceny */
  acceptedDate?: Date;
  createdAt: Date;
  /** Adres realizacji */
  address?: string;
  /** Szerokość geograficzna (dla mapy) */
  lat?: number;
  /** Długość geograficzna (dla mapy) */
  lng?: number;
  /** Kolor znacznika na mapie */
  colorMarker?: string | null;
  isDeleted?: number;
  deletedAt?: Date;
}

/**
 * Projekt z rozszerzonymi relacjami (do wyświetlania)
 */
export interface ExtendedProject extends Project {
  client?: Client;
  suppliers?: Supplier[];
  employees?: Employee[];
  subProjects?: ExtendedProject[];
  parentProject?: ExtendedProject;
}

// ─────────────────────────────────────────────────────────────────────────────
// ZADANIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Podzadanie w ramach zadania
 */
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Zadanie projektowe
 */
export interface Task {
  id?: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: Date;
  /** Lista podzadań */
  subtasks?: Subtask[];
  /** Checklista (prosty format) */
  checklist?: { id: string; text: string; completed: boolean }[];
  createdAt: Date;
  isDeleted?: number;
  deletedAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WYDATKI I ZASOBY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wydatek projektowy (koszt)
 */
export interface Expense {
  id?: number;
  projectId: number;
  title: string;
  /** Kwota brutto */
  amount: number;
  /** Kwota netto (obliczana) */
  netAmount?: number;
  /** Stawka VAT (procent) */
  taxRate?: number;
  /** Typ kosztu: Employee=robocizna, Purchase=materiał */
  type: 'Employee' | 'Purchase';
  date: Date;
  /** Powiązanie z zamówieniem */
  orderId?: number;
  isDeleted?: number;
  deletedAt?: Date;
}

/**
 * Zasób/plik projektu
 */
export interface Resource {
  id?: number;
  projectId: number;
  name: string;
  /** Typ zasobu */
  type: 'File' | 'Image' | 'Link';
  /** URL dla linku, Blob dla pliku/obrazka */
  content: string | Blob;
  /** Wirtualny folder */
  folder?: string;
  createdAt: Date;
  isDeleted?: number;
  deletedAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOSTAWCY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dostawca materiałów/usług
 */
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

/**
 * Kategoria dostawców
 */
export interface SupplierCategory {
  id?: number;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WYCENY I ZAMÓWIENIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pozycja w wycenie projektu
 */
export interface QuotationItem {
  id?: number;
  projectId: number;
  description: string;
  quantity: number;
  unit: string;
  /** Cena jednostkowa netto */
  unitPrice: number;
  /** Marża (procent) */
  margin?: number;
  /** Cena z marżą */
  priceWithMargin?: number;
  /** Wartość całkowita pozycji */
  total: number;
  /** Sekcja grupująca */
  section?: string;
}

/**
 * Zamówienie na materiały
 */
export interface Order {
  id?: number;
  projectId: number;
  /** Opcjonalne powiązanie z zadaniem */
  taskId?: number;
  /** Opcjonalne powiązanie z dostawcą */
  supplierId?: number;
  title: string;
  /** Kwota brutto */
  amount: number;
  netAmount?: number;
  taxRate?: number;
  status: 'Pending' | 'Ordered' | 'Delivered';
  date: Date;
  quantity?: number;
  unit?: string;
  /** Czy dodano do magazynu po dostawie */
  addedToWarehouse?: boolean;
  notes?: string;
  /** Link do sklepu/produktu */
  url?: string;
  isDeleted?: number;
  deletedAt?: Date;
}

/**
 * Pozycja wyceny kosztów
 */
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

/**
 * Szablon zamówienia (szybkie tworzenie)
 */
export interface OrderTemplate {
  id?: number;
  title: string;
  defaultAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// POWIADOMIENIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Powiadomienie systemowe
 */
export interface Notification {
  id?: number;
  type: NotificationType;
  title: string;
  message: string;
  /** Czy przeczytane */
  read: boolean;
  createdAt: Date;
  /** ID powiązanego elementu */
  relatedId?: number;
  /** Typ powiązanego elementu */
  relatedType?: 'task' | 'order' | 'project';
}

// ─────────────────────────────────────────────────────────────────────────────
// PRACOWNICY I UPRAWNIENIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pracownik
 */
export interface Employee {
  id?: number;
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  email: string;
  /** Stawka godzinowa/dzienna */
  rate: number;
  status: 'Active' | 'Inactive';
  isDeleted?: number;
  /** Uprawnienia pracownika (certyfikaty, pozwolenia) */
  employeePermissions?: EmployeePermission[];
}

/**
 * Uprawnienie pracownika (certyfikat, pozwolenie)
 */
export interface EmployeePermission {
  id: number;
  employeeId: number;
  /** Nazwa uprawnienia/certyfikatu */
  name: string;
  /** Data wydania */
  issueDate: Date;
  /** Data ważności (null = bezterminowe) */
  expiryDate?: Date | null;
  /** Numer dokumentu */
  number?: string | null;
  // Pola specyficzne dla Paszportu BP
  /** Firma (dla Paszportu BP) */
  company?: string | null;
  /** Wystawca */
  issuer?: string | null;
  /** Numer w rejestrze */
  registryNumber?: string | null;
  /** Czy jest upoważniającym */
  isAuthorizer?: boolean;
  /** Czy jest zatwierdzającym */
  isApprover?: boolean;
  /** Czy jest kierownikiem zespołu */
  isTeamLeader?: boolean;
  /** Czy jest koordynatorem */
  isCoordinator?: boolean;
  createdAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// NARZĘDZIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Narzędzie/sprzęt
 */
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
  /** Przypisani pracownicy (relacja M:N) */
  assignedEmployees?: Employee[];
  /** Data ostatniego przeglądu */
  lastInspectionDate?: Date;
  /** Data ważności przeglądu */
  inspectionExpiryDate?: Date;
  /** Numer protokołu kontrolnego */
  protocolNumber?: string;
  isDeleted?: number;
}

/**
 * Kategoria narzędzi
 */
export interface ToolCategory {
  id?: number;
  name: string;
  /** Kolor dla UI */
  color: string;
}

/**
 * Dane protokołu kontrolnego narzędzia
 * Struktura odpowiada formularzowi kontrolnemu
 */
export interface ProtocolData {
  /** Sekcja: Informacje ogólne */
  general: { a: string, b: string, c: string, d: string };
  /** Sekcja: Demontaż */
  disassembly: { a: string, b: string, c: string, d: string };
  /** Sekcja: Zabezpieczenia */
  protection: { a: string, b: string };
  /** Wynik kontroli */
  result: string;
  /** Uwagi kontrolera */
  comments: string;
  /** Data kontroli */
  date: Date;
  /** Miejsce kontroli */
  place: string;
  /** Imię i nazwisko kontrolera */
  inspectorName: string;
  /** Okres ważności (miesiące) */
  validityMonths?: number;
  /** Data następnej kontroli */
  nextInspectionDate?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAGAZYN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pozycja magazynowa
 */
export interface WarehouseItem {
  id?: number;
  name: string;
  description?: string;
  /** Aktualna ilość */
  quantity: number;
  unit: string;
  /** Stan minimalny (alert) */
  minQuantity?: number;
  category?: string;
  /** Lokalizacja w magazynie */
  location?: string;
  lastUpdated: Date;
  isDeleted?: number;
}

/**
 * Historia operacji magazynowych
 */
export interface WarehouseHistoryItem {
  id?: number;
  /** ID pozycji magazynowej */
  itemId: number;
  /** Typ operacji: IN=przyjęcie, OUT=wydanie */
  type: 'IN' | 'OUT';
  /** Ilość */
  quantity: number;
  date: Date;
  /** Powód/opis operacji */
  reason?: string;
  /** ID użytkownika wykonującego operację */
  userId?: number;
}
