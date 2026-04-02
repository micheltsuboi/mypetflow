// =====================================================
// SR PET CLUBE - TypeScript Types
// =====================================================

// Enums
export type UserRole = 'superadmin' | 'admin' | 'staff' | 'customer'
export type PetSpecies = 'dog' | 'cat' | 'other'
export type PetSize = 'small' | 'medium' | 'large' | 'giant'
export type PetGender = 'male' | 'female'
export type ServiceCategory = 'banho' | 'tosa' | 'banho_tosa' | 'hotel' | 'creche' | 'combo' | 'veterinario' | 'outro'
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'done' | 'canceled' | 'no_show'
export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix' | 'credit_package'
export type ReportType = 'photo' | 'feeding' | 'activity' | 'health' | 'bath_start' | 'bath_end' | 'general'

// =====================================================
// Database Types
// =====================================================

export interface Organization {
    id: string
    name: string
    subdomain: string
    logo_url: string | null
    settings: OrganizationSettings
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface OrganizationSettings {
    business_hours: {
        open: string
        close: string
    }
    working_days: number[]
}

export interface Profile {
    id: string
    org_id: string | null
    email: string
    full_name: string | null
    phone: string | null
    role: UserRole
    permissions?: string[] | null
    avatar_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TimeEntry {
    id: string
    user_id: string
    org_id: string
    clock_in: string
    clock_out: string | null
    justification: string | null
    created_at: string
}

export interface Customer {
    id: string
    org_id: string
    user_id: string | null
    name: string
    cpf: string | null
    phone_1: string | null
    phone_2: string | null
    email: string | null
    address: string | null
    neighborhood: string | null
    city: string | null
    instagram: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface Pet {
    id: string
    customer_id: string
    name: string
    species: PetSpecies
    breed: string | null
    color: string | null
    size: PetSize | null
    birth_date: string | null
    weight_kg: number | null
    is_neutered: boolean
    gender: PetGender | null
    medical_notes: string | null
    allergies: string | null
    temperament: string | null
    perfume_allowed: boolean
    accessories_allowed: boolean
    special_care: string | null
    photo_url: string | null
    vaccination_card_url: string | null
    last_vaccination_date: string | null
    next_vaccination_date: string | null
    is_active: boolean
    is_adapted: boolean
    created_at: string
    updated_at: string
}

export interface Service {
    id: string
    org_id: string
    name: string
    description: string | null
    base_price: number
    category: ServiceCategory
    duration_minutes: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface PricingMatrix {
    id: string
    service_id: string
    weight_min: number | null
    weight_max: number | null
    size: PetSize | null
    day_of_week: number | null
    fixed_price: number
    is_active: boolean
    created_at: string
}

export interface ServiceCredit {
    id: string
    pet_id: string
    org_id: string
    service_type: string
    total_quantity: number
    remaining_quantity: number
    unit_price: number | null
    total_paid: number | null
    purchased_at: string
    expires_at: string | null
    created_at: string
}

export interface Appointment {
    id: string
    pet_id: string
    service_id: string
    org_id: string
    staff_id: string | null
    customer_id: string | null
    scheduled_at: string
    started_at: string | null
    completed_at: string | null
    status: AppointmentStatus
    calculated_price: number | null
    final_price: number | null
    discount: number
    payment_method: PaymentMethod | null
    notes: string | null
    used_credit: boolean
    credit_id: string | null
    checklist: ChecklistItem[]
    created_at: string
    updated_at: string
}

export interface ChecklistItem {
    id: string
    label: string
    checked: boolean
}

export interface DailyReport {
    id: string
    appointment_id: string | null
    pet_id: string
    staff_id: string | null
    org_id: string
    photo_url: string | null
    video_url: string | null
    observation: string | null
    report_type: ReportType
    is_public: boolean
    created_at: string
}

// =====================================================
// Extended Types (with relations)
// =====================================================

export interface PetWithCustomer extends Pet {
    customer: Customer
}

export interface AppointmentWithDetails extends Appointment {
    pet: PetWithCustomer
    service: Service
    staff: Profile | null
}

export interface DailyReportWithDetails extends DailyReport {
    pet: Pet
    staff: Profile | null
}

export interface LowCreditAlert {
    credit_id: string
    pet_id: string
    pet_name: string
    customer_name: string
    service_type: string
    remaining: number
}

// =====================================================
// Form Types
// =====================================================

export interface CustomerFormData {
    name: string
    cpf?: string
    phone_1?: string
    phone_2?: string
    email?: string
    address?: string
    neighborhood?: string
    city?: string
    instagram?: string
    notes?: string
}

export interface PetFormData {
    customer_id: string
    name: string
    species: PetSpecies
    breed?: string
    color?: string
    size?: PetSize
    birth_date?: string
    weight_kg?: number
    is_neutered?: boolean
    gender?: PetGender
    medical_notes?: string
    allergies?: string
    temperament?: string
    perfume_allowed?: boolean
    accessories_allowed?: boolean
    special_care?: string
}

export interface AppointmentFormData {
    pet_id: string
    service_id: string
    scheduled_at: string
    staff_id?: string
    notes?: string
}

export interface Product {
    id: string
    org_id: string
    name: string
    category: string
    price: number
    cost_price?: number
    stock_quantity: number
    min_stock_alert?: number
    expiration_date: string | null
    image_url: string | null
    bar_code?: string
    description?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface Vaccine {
    id: string
    org_id: string
    name: string
    manufacturer: string
    description?: string
    target_animals: string[] // e.g. ['Cão', 'Gato']
    veterinarian_id?: string
    created_at: string
    updated_at: string
}

export interface VaccineBatch {
    id: string
    vaccine_id: string
    batch_number: string
    quantity: number
    cost_price: number
    selling_price: number
    expiration_date: string
    is_active: boolean
    created_at: string
}

// Financial Transaction Interface
export interface FinancialTransaction {
    id: string
    org_id: string
    type: 'income' | 'expense'
    category: string
    amount: number
    description?: string
    payment_method?: string
    date: string
    created_by?: string
    reference_id?: string
    created_at: string
    updated_at: string
}

export interface Order {
    id: string
    org_id: string
    customer_id: string | null
    pet_id: string | null
    total_amount: number
    discount_amount: number
    payment_status: 'paid' | 'pending'
    payment_method: string | null
    financial_transaction_id: string | null
    created_at: string
    created_by: string | null
}

export interface OrderItem {
    id: string
    order_id: string
    product_id: string | null
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
    discount_percent: number
    created_at: string
}

// =====================================================
// Cashback Types
// =====================================================

/**
 * Represents the cashback balance for a tutor.
 */
export interface Cashback {
    id: string;
    tutor_id: string;
    balance: number;
    updated_at: string;
}

/**
 * Rule that defines how cashback is generated.
 * type: 'product' or 'category'
 * target_id: id of the product or category
 */
export interface CashbackRule {
    id: string;
    org_id: string;
    type: 'product' | 'category';
    target_id: string;
    percent: number; // percentage of the product price to credit as cashback
    validity_months: number;
    created_by: string;
    created_at: string;
}

export interface CashbackTransaction {
    id: string;
    tutor_id: string;
    org_id: string;
    order_id: string;
    amount: number;
    original_amount: number;
    expires_at: string;
    created_at: string;
}

export interface ProductFormData {
    name: string
    category: string
    cost_price: number
    selling_price: number
    stock_quantity: number
    expiration_date?: string
    image_url?: string | null
    bar_code?: string
    description?: string
    codigo_ncm?: string
    cfop?: string
}

export interface ExpenseCategory {
    id: string
    org_id: string
    name: string
    created_at: string
    updated_at: string
}

export interface RecurringExpense {
    id: string
    org_id: string
    category_id: string | null
    category_name: string | null
    description: string
    amount: number
    start_date: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface RecurringExpenseException {
    id: string
    recurring_expense_id: string
    month_year: string
    created_at: string
}

// =====================================================
// Veterinary Module Types
// =====================================================

export interface Veterinarian {
    id: string
    org_id: string
    name: string
    crmv: string
    specialty?: string
    phone?: string
    email?: string
    consultation_base_price: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface VetConsultation {
    id: string
    org_id: string
    pet_id: string
    veterinarian_id?: string
    consultation_date: string
    reason?: string
    diagnosis?: string
    treatment?: string
    prescription?: string
    notes?: string
    consultation_fee: number
    discount_percent: number
    payment_status: 'pending' | 'paid'
    created_by?: string
    created_at: string
    updated_at: string
}

export interface VetRecord {
    id: string
    org_id: string
    pet_id: string
    veterinarian_id?: string
    record_date: string
    title: string
    content: string
    created_by?: string
    created_at: string
    updated_at: string
}

export interface VetExamType {
    id: string
    org_id: string
    name: string
    description?: string
    base_price: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface VetExam {
    id: string
    org_id: string
    pet_id: string
    veterinarian_id?: string
    exam_type_id?: string
    exam_type_name: string
    exam_date: string
    result_notes?: string
    file_url?: string
    price: number
    discount_percent: number
    payment_status: 'pending' | 'paid'
    created_by?: string
    created_at: string
    updated_at: string
}

// =====================================================
// Focus NFe Types
// =====================================================

export interface FiscalConfig {
    id: string
    org_id: string
    focus_empresa_id: string | null
    token_producao: string | null
    token_homologacao: string | null
    ambiente: 'homologacao' | 'producao'
    cnpj: string | null
    razao_social: string | null
    inscricao_municipal: string | null
    inscricao_estadual: string | null
    regime_tributario: number
    optante_simples_nacional: boolean
    codigo_municipio: string | null
    municipio: string | null
    uf: string | null
    cep: string | null
    item_lista_servico: string | null
    aliquota_iss: number
    codigo_tributario_municipio: string | null
    habilita_nfse: boolean
    habilita_nfe: boolean
    certificado_base64: string | null
    senha_certificado: string | null
    certificado_valido_ate: string | null
    resp_tecnico_cnpj: string | null
    resp_tecnico_contato: string | null
    resp_tecnico_email: string | null
    resp_tecnico_telefone: string | null
    resp_tecnico_id_csrt: string | null
    resp_tecnico_hash_csrt: string | null
    ativo: boolean
    created_at: string
    updated_at: string
}

export type NotaFiscalStatus = 'processando' | 'autorizado' | 'cancelado' | 'erro'
export type NotaFiscalTipo = 'nfse' | 'nfe'
export type NotaFiscalOrigem = 'atendimento' | 'banho_tosa' | 'creche' | 'pdv'

export interface NotaFiscal {
    id: string
    org_id: string
    referencia: string
    tipo: NotaFiscalTipo
    status: NotaFiscalStatus
    numero_nf: string | null
    serie: string | null
    chave_nf: string | null
    tomador_nome: string | null
    tomador_cpf_cnpj: string | null
    valor_total: number | null
    caminho_xml: string | null
    caminho_pdf: string | null
    mensagem_sefaz: string | null
    origem_tipo: NotaFiscalOrigem | null
    origem_id: string | null
    payload_enviado: any | null
    retorno_focus: any | null
    created_at: string
    updated_at: string
}

export interface ProdutoFiscal {
    produto_id: string
    codigo_ncm: string
    cfop: string
    icms_situacao_tributaria: string
    icms_origem: string
    pis_situacao_tributaria: string
    cofins_situacao_tributaria: string
    unidade_comercial: string
    created_at: string
    updated_at: string
}

