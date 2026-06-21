"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Trash2, Loader2, Receipt, ChevronLeft, ChevronRight } from "lucide-react"
import { formatPKR } from "@/lib/utils/currency"
import { get1010MonthRange, format1010MonthLabel } from "@/lib/utils/month-cycle"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { value: "Rent",        label: "Rent",            color: "bg-blue-100 text-blue-700" },
  { value: "Electricity", label: "Electricity",      color: "bg-yellow-100 text-yellow-700" },
  { value: "Internet",    label: "Internet",         color: "bg-cyan-100 text-cyan-700" },
  { value: "Food",        label: "Food & Meals",     color: "bg-orange-100 text-orange-700" },
  { value: "Salary",      label: "Salaries",         color: "bg-purple-100 text-purple-700" },
  { value: "Transport",   label: "Transport",        color: "bg-green-100 text-green-700" },
  { value: "Other",       label: "Other",            color: "bg-gray-100 text-gray-700" },
]

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1]
}

interface Expense {
  id: string
  amount: number
  category: string
  description: string
  expenseDate: string
  notes: string | null
  recordedBy: string
}

function buildMonthList() {
  const list: Array<{ label: string; dateStr: string }> = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - i)
    const { monthLabel } = get1010MonthRange(d)
    list.push({ label: i === 0 ? `${monthLabel} (Current)` : monthLabel, dateStr: d.toISOString().split("T")[0] })
  }
  return list
}

export default function ExpensesPage() {
  const months = buildMonthList()
  const [monthIdx, setMonthIdx] = useState(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedMonth = months[monthIdx]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses?timeframe=month&date=${selectedMonth.dateStr}`)
      if (!res.ok) throw new Error()
      setExpenses(await res.json())
    } catch {
      toast.error("Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }, [selectedMonth.dateStr])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setCategory(""); setDescription(""); setAmount("")
    setExpenseDate(new Date().toISOString().split("T")[0]); setNotes("")
  }

  async function handleAdd() {
    if (!category) { toast.error("Select a category"); return }
    if (!description.trim()) { toast.error("Description is required"); return }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return }

    setSaving(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), category, description, expenseDate, notes }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success("Expense added")
      setAddOpen(false)
      resetForm()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add expense")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Expense deleted")
      setDeleteId(null)
      load()
    } catch {
      toast.error("Failed to delete expense")
    } finally {
      setDeleting(false)
    }
  }

  // Totals
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0)

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
          <p className="text-xs text-gray-500 mt-0.5">Shop running costs &amp; bills</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="h-10">
          <Plus className="w-4 h-4 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="icon" className="h-9 w-9"
          onClick={() => setMonthIdx((i) => Math.min(i + 1, months.length - 1))}
          disabled={monthIdx >= months.length - 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-sm font-medium text-gray-800">{selectedMonth.label}</p>
        </div>
        <Button
          variant="outline" size="icon" className="h-9 w-9"
          onClick={() => setMonthIdx((i) => Math.max(i - 1, 0))}
          disabled={monthIdx === 0}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <>
          {/* Total card */}
          <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white border-0">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm opacity-80">Total Expenses</p>
              <p className="text-3xl font-bold mt-1">{formatPKR(total)}</p>
              {byCategory.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {byCategory.map((c) => (
                    <span key={c.value} className="text-xs bg-white/20 rounded-full px-2.5 py-1">
                      {c.label}: {formatPKR(c.total)}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense list */}
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No expenses recorded this period</p>
                <Button onClick={() => setAddOpen(true)} className="mt-4" variant="outline">
                  Add First Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const meta = getCategoryMeta(expense.category)
                return (
                  <Card key={expense.id} className="shadow-sm">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("text-xs border-0 font-medium", meta.color)}>
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(expense.expenseDate).toLocaleDateString("en-PK", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm mt-1">{expense.description}</p>
                        {expense.notes && (
                          <p className="text-xs text-gray-400 mt-0.5">{expense.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">by {expense.recordedBy}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="font-bold text-gray-900">{formatPKR(expense.amount)}</p>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => setDeleteId(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-sm w-full flex flex-col max-h-[92vh] p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription className="text-xs">Record a shop expense or bill</DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-left",
                      category === c.value
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                placeholder="e.g. July rent payment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (PKR) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11"
                  min={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Any extra details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
            <Button variant="outline" onClick={() => { setAddOpen(false); resetForm() }} disabled={saving} className="flex-1 h-11">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving} className="flex-1 h-11">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="h-11">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="h-11 bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
