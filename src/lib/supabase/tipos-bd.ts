// Tipos generados automáticamente desde la base de datos de Supabase. NO editar a mano.
// Para regenerarlos: npm run db:tipos


export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "accesses": {
                  Row: {
                    "company_id": string | null,"created_at": string,"has_password": boolean | null,"id": string,"password_enc": string | null,"service": string,"updated_at": string,"url": string,"username": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"has_password"?: never,"id"?: string,"password_enc"?: string | null,"service": string,"updated_at"?: string,"url"?: string,"username"?: string,"workspace_id": string
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"has_password"?: never,"id"?: string,"password_enc"?: string | null,"service"?: string,"updated_at"?: string,"url"?: string,"username"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accesses_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "accesses_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"activities": {
                  Row: {
                    "contact_id": string | null,"created_at": string,"date": string,"id": string,"project_id": string | null,"text": string,"type": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_id"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"project_id"?: string | null,"text": string,"type": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "contact_id"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"project_id"?: string | null,"text"?: string,"type"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "activities_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"app_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "address": string,"brand": NonNullable<Json>,"created_at": string,"email": string,"id": string,"is_private": boolean,"name": string,"nif": string,"notes": string,"phone": string,"sector": string,"updated_at": string,"web": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"brand"?: NonNullable<Json>,"created_at"?: string,"email"?: string,"id"?: string,"is_private"?: boolean,"name": string,"nif"?: string,"notes"?: string,"phone"?: string,"sector"?: string,"updated_at"?: string,"web"?: string,"workspace_id": string
                  }
                  Update: {
                    "address"?: string,"brand"?: NonNullable<Json>,"created_at"?: string,"email"?: string,"id"?: string,"is_private"?: boolean,"name"?: string,"nif"?: string,"notes"?: string,"phone"?: string,"sector"?: string,"updated_at"?: string,"web"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "availability": string | null,"company_id": string | null,"consent": boolean,"consent_date": string | null,"consent_via": string | null,"created_at": string,"email": string,"id": string,"name": string,"nif": string,"notes": string,"phone": string,"rate": number | null,"role": string,"specialty": string | null,"status": string,"tags": (string)[],"type": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: string | null,"company_id"?: string | null,"consent"?: boolean,"consent_date"?: string | null,"consent_via"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"name": string,"nif"?: string,"notes"?: string,"phone"?: string,"rate"?: number | null,"role"?: string,"specialty"?: string | null,"status"?: string,"tags"?: (string)[],"type"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "availability"?: string | null,"company_id"?: string | null,"consent"?: boolean,"consent_date"?: string | null,"consent_via"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"name"?: string,"nif"?: string,"notes"?: string,"phone"?: string,"rate"?: number | null,"role"?: string,"specialty"?: string | null,"status"?: string,"tags"?: (string)[],"type"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "contacts_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"deals": {
                  Row: {
                    "closed_at": string | null,"company_id": string | null,"contact_id": string | null,"created_at": string,"discipline": string | null,"expected": string | null,"id": string,"lost_reason": string,"notes": string,"prob": number,"project_id": string | null,"source": string,"stage": string,"title": string,"updated_at": string,"value": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"discipline"?: string | null,"expected"?: string | null,"id"?: string,"lost_reason"?: string,"notes"?: string,"prob"?: number,"project_id"?: string | null,"source"?: string,"stage"?: string,"title": string,"updated_at"?: string,"value"?: number,"workspace_id": string
                  }
                  Update: {
                    "closed_at"?: string | null,"company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"discipline"?: string | null,"expected"?: string | null,"id"?: string,"lost_reason"?: string,"notes"?: string,"prob"?: number,"project_id"?: string | null,"source"?: string,"stage"?: string,"title"?: string,"updated_at"?: string,"value"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deals_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "deals_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "deals_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"deliverables": {
                  Row: {
                    "approved_at": string | null,"billed_extra": number,"created_at": string,"feedback": NonNullable<Json>,"id": string,"name": string,"project_id": string,"sent_at": string | null,"status": string,"updated_at": string,"versions": NonNullable<Json>,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"billed_extra"?: number,"created_at"?: string,"feedback"?: NonNullable<Json>,"id"?: string,"name": string,"project_id": string,"sent_at"?: string | null,"status"?: string,"updated_at"?: string,"versions"?: NonNullable<Json>,"workspace_id": string
                  }
                  Update: {
                    "approved_at"?: string | null,"billed_extra"?: number,"created_at"?: string,"feedback"?: NonNullable<Json>,"id"?: string,"name"?: string,"project_id"?: string,"sent_at"?: string | null,"status"?: string,"updated_at"?: string,"versions"?: NonNullable<Json>,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverables_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"events": {
                  Row: {
                    "contact_id": string | null,"created_at": string,"date": string,"id": string,"project_id": string | null,"source": string | null,"time": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_id"?: string | null,"created_at"?: string,"date": string,"id"?: string,"project_id"?: string | null,"source"?: string | null,"time"?: string,"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "contact_id"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"project_id"?: string | null,"source"?: string | null,"time"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "base": number,"category": string,"concept": string,"contact_id": string | null,"created_at": string,"date": string,"deductible": boolean,"id": string,"iva_pct": number,"project_id": string | null,"receipt_name": string,"receipt_path": string,"supplier": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base"?: number,"category"?: string,"concept": string,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"deductible"?: boolean,"id"?: string,"iva_pct"?: number,"project_id"?: string | null,"receipt_name"?: string,"receipt_path"?: string,"supplier": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "base"?: number,"category"?: string,"concept"?: string,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"deductible"?: boolean,"id"?: string,"iva_pct"?: number,"project_id"?: string | null,"receipt_name"?: string,"receipt_path"?: string,"supplier"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "expenses_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"files": {
                  Row: {
                    "company_id": string | null,"contact_id": string | null,"created_at": string,"date": string,"id": string,"mime": string,"name": string,"project_id": string | null,"size": number,"storage_path": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"mime"?: string,"name": string,"project_id"?: string | null,"size"?: number,"storage_path"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"mime"?: string,"name"?: string,"project_id"?: string | null,"size"?: number,"storage_path"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "files_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "files_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "files_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"invoice_counters": {
                  Row: {
                    "last": number,"series": string,"workspace_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "last"?: number,"series": string,"workspace_id": string,"year": number
                  }
                  Update: {
                    "last"?: number,"series"?: string,"workspace_id"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoice_counters_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "client": Json | null,"company_id": string | null,"contact_id": string | null,"created_at": string,"date": string,"deal_id": string | null,"due": string | null,"from_quote_id": string | null,"id": string,"irpf": number,"issued_at": string | null,"issuer": Json | null,"iva": number,"kind": string,"lines": NonNullable<Json>,"notes": string,"number": string,"project_id": string | null,"rectifies_id": string | null,"retainer_id": string | null,"series": string,"status": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client"?: Json | null,"company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"deal_id"?: string | null,"due"?: string | null,"from_quote_id"?: string | null,"id"?: string,"irpf"?: number,"issued_at"?: string | null,"issuer"?: Json | null,"iva"?: number,"kind": string,"lines"?: NonNullable<Json>,"notes"?: string,"number"?: string,"project_id"?: string | null,"rectifies_id"?: string | null,"retainer_id"?: string | null,"series": string,"status"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "client"?: Json | null,"company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"deal_id"?: string | null,"due"?: string | null,"from_quote_id"?: string | null,"id"?: string,"irpf"?: number,"issued_at"?: string | null,"issuer"?: Json | null,"iva"?: number,"kind"?: string,"lines"?: NonNullable<Json>,"notes"?: string,"number"?: string,"project_id"?: string | null,"rectifies_id"?: string | null,"retainer_id"?: string | null,"series"?: string,"status"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "invoices_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "invoices_workspace_id_deal_id_fkey"
      columns: ["workspace_id","deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "invoices_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_workspace_id_from_quote_id_fkey"
      columns: ["workspace_id","from_quote_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "invoices_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "invoices_workspace_id_rectifies_id_fkey"
      columns: ["workspace_id","rectifies_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "invoices_workspace_id_retainer_id_fkey"
      columns: ["workspace_id","retainer_id"]
isOneToOne: false
      referencedRelation: "retainers"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "color": string,"contact_id": string | null,"created_at": string,"date": string,"id": string,"pinned": boolean,"project_id": string | null,"text": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"pinned"?: boolean,"project_id"?: string | null,"text": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "color"?: string,"contact_id"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"pinned"?: boolean,"project_id"?: string | null,"text"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "notes_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notes_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"notification_reads": {
                  Row: {
                    "created_at": string,"id": string,"key": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"key": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"key"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_reads_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"date": string,"id": string,"invoice_id": string,"method": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"date"?: string,"id"?: string,"invoice_id": string,"method"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"date"?: string,"id"?: string,"invoice_id"?: string,"method"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_workspace_id_invoice_id_fkey"
      columns: ["workspace_id","invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "channel": string,"company_id": string | null,"copy": string,"created_at": string,"date": string,"id": string,"status": string,"time": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel"?: string,"company_id"?: string | null,"copy"?: string,"created_at"?: string,"date": string,"id"?: string,"status"?: string,"time"?: string,"title": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "channel"?: string,"company_id"?: string | null,"copy"?: string,"created_at"?: string,"date"?: string,"id"?: string,"status"?: string,"time"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "posts_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active_timer": Json | null,"created_at": string,"email": string,"full_name": string,"id": string,"name": string,"phone": string,"prefs": NonNullable<Json>,"privacy_accepted_at": string | null,"role": string,"signup_data": NonNullable<Json>,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_timer"?: Json | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id": string,"name"?: string,"phone"?: string,"prefs"?: NonNullable<Json>,"privacy_accepted_at"?: string | null,"role"?: string,"signup_data"?: NonNullable<Json>,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "active_timer"?: Json | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"name"?: string,"phone"?: string,"prefs"?: NonNullable<Json>,"privacy_accepted_at"?: string | null,"role"?: string,"signup_data"?: NonNullable<Json>,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_collaborators": {
                  Row: {
                    "contact_id": string,"created_at": string,"id": string,"project_id": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_id": string,"created_at"?: string,"id"?: string,"project_id": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "contact_id"?: string,"created_at"?: string,"id"?: string,"project_id"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_collaborators_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "project_collaborators_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_collaborators_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "brief": NonNullable<Json>,"budget": number,"contact_id": string | null,"created_at": string,"description": string,"discipline": string | null,"end": string | null,"hours_budget": number,"id": string,"name": string,"portfolio": NonNullable<Json>,"prev_status": string | null,"priority": string,"rounds_included": number,"start": string | null,"status": string,"tags": (string)[],"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brief"?: NonNullable<Json>,"budget"?: number,"contact_id"?: string | null,"created_at"?: string,"description"?: string,"discipline"?: string | null,"end"?: string | null,"hours_budget"?: number,"id"?: string,"name": string,"portfolio"?: NonNullable<Json>,"prev_status"?: string | null,"priority"?: string,"rounds_included"?: number,"start"?: string | null,"status"?: string,"tags"?: (string)[],"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "brief"?: NonNullable<Json>,"budget"?: number,"contact_id"?: string | null,"created_at"?: string,"description"?: string,"discipline"?: string | null,"end"?: string | null,"hours_budget"?: number,"id"?: string,"name"?: string,"portfolio"?: NonNullable<Json>,"prev_status"?: string | null,"priority"?: string,"rounds_included"?: number,"start"?: string | null,"status"?: string,"tags"?: (string)[],"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "projects_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"renewals": {
                  Row: {
                    "company_id": string | null,"cost": number,"created_at": string,"id": string,"name": string,"price": number,"provider": string,"renew_date": string,"type": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string | null,"cost"?: number,"created_at"?: string,"id"?: string,"name": string,"price"?: number,"provider"?: string,"renew_date": string,"type"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "company_id"?: string | null,"cost"?: number,"created_at"?: string,"id"?: string,"name"?: string,"price"?: number,"provider"?: string,"renew_date"?: string,"type"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "renewals_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "renewals_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"retainers": {
                  Row: {
                    "active": boolean,"billing_day": number,"company_id": string | null,"contact_id": string | null,"created_at": string,"discipline": string | null,"extra_billed": string,"fee": number,"hours": number,"id": string,"last_billed": string,"name": string,"services": string,"start": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"billing_day"?: number,"company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"discipline"?: string | null,"extra_billed"?: string,"fee"?: number,"hours"?: number,"id"?: string,"last_billed"?: string,"name": string,"services"?: string,"start"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "active"?: boolean,"billing_day"?: number,"company_id"?: string | null,"contact_id"?: string | null,"created_at"?: string,"discipline"?: string | null,"extra_billed"?: string,"fee"?: number,"hours"?: number,"id"?: string,"last_billed"?: string,"name"?: string,"services"?: string,"start"?: string | null,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "retainers_workspace_id_company_id_fkey"
      columns: ["workspace_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "retainers_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "retainers_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string | null,"blocked_by": string | null,"contact_id": string | null,"created_at": string,"done": boolean,"due": string | null,"estimate": number,"id": string,"important": boolean,"next_created": boolean,"phase": string | null,"project_id": string | null,"repeat": string,"title": string,"updated_at": string,"urgent": boolean,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"blocked_by"?: string | null,"contact_id"?: string | null,"created_at"?: string,"done"?: boolean,"due"?: string | null,"estimate"?: number,"id"?: string,"important"?: boolean,"next_created"?: boolean,"phase"?: string | null,"project_id"?: string | null,"repeat"?: string,"title": string,"updated_at"?: string,"urgent"?: boolean,"workspace_id": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"blocked_by"?: string | null,"contact_id"?: string | null,"created_at"?: string,"done"?: boolean,"due"?: string | null,"estimate"?: number,"id"?: string,"important"?: boolean,"next_created"?: boolean,"phase"?: string | null,"project_id"?: string | null,"repeat"?: string,"title"?: string,"updated_at"?: string,"urgent"?: boolean,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_workspace_id_assignee_id_fkey"
      columns: ["workspace_id","assignee_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "tasks_workspace_id_blocked_by_fkey"
      columns: ["workspace_id","blocked_by"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "tasks_workspace_id_contact_id_fkey"
      columns: ["workspace_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "tasks_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"time_entries": {
                  Row: {
                    "billable": boolean,"created_at": string,"date": string,"id": string,"minutes": number,"note": string,"project_id": string | null,"retainer_id": string | null,"task_id": string | null,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billable"?: boolean,"created_at"?: string,"date"?: string,"id"?: string,"minutes": number,"note"?: string,"project_id"?: string | null,"retainer_id"?: string | null,"task_id"?: string | null,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "billable"?: boolean,"created_at"?: string,"date"?: string,"id"?: string,"minutes"?: number,"note"?: string,"project_id"?: string | null,"retainer_id"?: string | null,"task_id"?: string | null,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_entries_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "time_entries_workspace_id_project_id_fkey"
      columns: ["workspace_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "time_entries_workspace_id_retainer_id_fkey"
      columns: ["workspace_id","retainer_id"]
isOneToOne: false
      referencedRelation: "retainers"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "time_entries_workspace_id_task_id_fkey"
      columns: ["workspace_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "created_at": string,"id": string,"role": string,"updated_at": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"role"?: string,"updated_at"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"role"?: string,"updated_at"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_settings": {
                  Row: {
                    "address": string,"business": string,"capacity": number,"created_at": string,"disciplines": (string)[],"extra_round": number,"iban": string,"id": string,"irpf": number,"irpf_mode": string,"iva": number,"kind": string,"legal_name": string,"new_autonomo": boolean,"nif": string,"onboarded": boolean,"pay_days": number,"pay_online": NonNullable<Json>,"rate": number,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"business"?: string,"capacity"?: number,"created_at"?: string,"disciplines"?: (string)[],"extra_round"?: number,"iban"?: string,"id"?: string,"irpf"?: number,"irpf_mode"?: string,"iva"?: number,"kind"?: string,"legal_name"?: string,"new_autonomo"?: boolean,"nif"?: string,"onboarded"?: boolean,"pay_days"?: number,"pay_online"?: NonNullable<Json>,"rate"?: number,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "address"?: string,"business"?: string,"capacity"?: number,"created_at"?: string,"disciplines"?: (string)[],"extra_round"?: number,"iban"?: string,"id"?: string,"irpf"?: number,"irpf_mode"?: string,"iva"?: number,"kind"?: string,"legal_name"?: string,"new_autonomo"?: boolean,"nif"?: string,"onboarded"?: boolean,"pay_days"?: number,"pay_online"?: NonNullable<Json>,"rate"?: number,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_settings_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: true
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_privacy":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"admin_list_accounts":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"email": string,"email_confirmed_at": string,"full_name": string,"id": string,"privacy_accepted_at": string,"status": string
            }[]
                           },
"admin_set_status":
{ Args: { "new_status": string,"target": string }; Returns: undefined
                           },
"clave_accesos":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"emitir_documento":
{ Args: { "p_id": string }; Returns: {
              "client": Json | null,
"company_id": string | null,
"contact_id": string | null,
"created_at": string,
"date": string,
"deal_id": string | null,
"due": string | null,
"from_quote_id": string | null,
"id": string,
"irpf": number,
"issued_at": string | null,
"issuer": Json | null,
"iva": number,
"kind": string,
"lines": NonNullable<Json>,
"notes": string,
"number": string,
"project_id": string | null,
"rectifies_id": string | null,
"retainer_id": string | null,
"series": string,
"status": string,
"updated_at": string,
"workspace_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "invoices"
        isOneToOne: true
        isSetofReturn: false
      } },
"espacio_de_ruta":
{ Args: { "ruta": string }; Returns: string
                           },
"guardar_acceso":
{ Args: { "p_company": string,"p_id": string,"p_password": string,"p_service": string,"p_url": string,"p_username": string,"p_workspace": string }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_member":
{ Args: { "ws": string }; Returns: boolean
                           },
"ver_clave_acceso":
{ Args: { "p_id": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
