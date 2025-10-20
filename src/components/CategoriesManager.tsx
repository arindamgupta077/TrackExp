import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Pencil, Trash2, Image } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { useAuth } from '@/hooks/useAuth'
import { IconPicker } from '@/components/IconPicker'
import { getIconByCategoryName } from '@/data/categoryIcons'

interface CategoriesManagerProps {
  isOpen: boolean
  onClose: () => void
  onChanged?: () => void
}

const CategoriesManager = ({ isOpen, onClose, onChanged }: CategoriesManagerProps) => {
  const { user } = useAuth()
  const { categories, addCategory, updateCategory, updateCategoryIcon, deleteCategory, removeAllDefaultCategories } = useCategories(user?.id)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [selectedCategoryForIcon, setSelectedCategoryForIcon] = useState<{ id: string; name: string; icon?: string } | null>(null)
  const [newCategoryIconPickerOpen, setNewCategoryIconPickerOpen] = useState(false)

  if (!isOpen) return null

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    const { error } = await addCategory(newName.trim(), newIcon)
    setNewName('')
    setNewIcon('📦')
    setAdding(false)
    if (!error) onChanged?.()
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditingName(name)
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return
    setBusyId(id)
    const { error } = await updateCategory(id, editingName.trim())
    setBusyId(null)
    setEditingId(null)
    setEditingName('')
    if (!error) onChanged?.()
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    const { error } = await deleteCategory(id)
    setBusyId(null)
    if (!error) onChanged?.()
  }

  const openIconPicker = (category: { id: string; name: string; icon?: string }) => {
    setSelectedCategoryForIcon(category)
    setIconPickerOpen(true)
  }

  const handleIconSelect = async (icon: string) => {
    if (!selectedCategoryForIcon) return
    
    setBusyId(selectedCategoryForIcon.id)
    const { error } = await updateCategoryIcon(selectedCategoryForIcon.id, icon)
    setBusyId(null)
    
    if (!error) {
      onChanged?.()
    }
    
    setSelectedCategoryForIcon(null)
  }

  const handleNewCategoryIconSelect = (icon: string) => {
    setNewIcon(icon)
    setNewCategoryIconPickerOpen(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-2 z-50">
      <Card className="glass-card p-3 sm:p-4 w-full max-w-full sm:max-w-2xl lg:max-w-4xl border-white/20 max-h-[100vh] sm:max-h-[95vh] overflow-hidden flex flex-col mx-2 sm:mx-0">
        <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl text-white">Manage Categories</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 sm:h-7 sm:w-7 lg:h-8 lg:w-8 p-0 hover:bg-white/10 touch-manipulation">
              <X className="h-4 w-4 sm:h-3 sm:w-3 lg:h-4 lg:w-4 text-white" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-category" className="text-white text-sm sm:text-base font-medium">Add New Category</Label>
              
              {/* Category Name Input */}
              <Input 
                id="new-category" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Utilities" 
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 text-base sm:text-base h-12 sm:h-10 touch-manipulation" 
              />

              {/* Icon Selection */}
              <div className="space-y-1">
                <Label className="text-white text-sm sm:text-base font-medium">Select Icon</Label>
                <button
                  onClick={() => setNewCategoryIconPickerOpen(true)}
                  className="flex items-center gap-2 p-3 sm:p-2.5 rounded-md border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-200 w-full touch-manipulation min-h-[48px]"
                >
                  <span className="text-xl sm:text-2xl">{newIcon}</span>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm sm:text-base font-medium">Current Icon</span>
                    <span className="text-white/60 text-xs sm:text-sm">Click to change</span>
                  </div>
                </button>
              </div>

              {/* Add Button */}
              <div className="flex justify-end pt-1">
                <Button 
                  onClick={handleAdd} 
                  disabled={adding || !newName.trim()} 
                  className="h-12 sm:h-10 text-base sm:text-base px-6 sm:px-6 touch-manipulation"
                >
                  <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  {adding ? 'Adding...' : 'Add Category'}
                </Button>
              </div>
            </div>

            {/* Remove Default Categories Button */}
            {categories.some(cat => ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Health', 'Travel', 'Education', 'Other'].includes(cat.name)) && (
              <div className="space-y-2">
                <Label className="text-white text-sm sm:text-base font-medium">Default Categories</Label>
                <Button 
                  onClick={async () => {
                    const { error } = await removeAllDefaultCategories()
                    if (!error) onChanged?.()
                  }}
                  variant="outline"
                  className="w-full h-12 sm:h-10 text-base sm:text-base border-red-500/50 text-red-400 hover:bg-red-500/20 touch-manipulation"
                >
                  Remove All Default Categories
                </Button>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  This will permanently remove default categories and they won't return even after clearing browser cache.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-white text-sm sm:text-base font-medium">Your Categories</Label>
              <div className="space-y-2 max-h-96 sm:max-h-96 lg:max-h-[500px] overflow-auto pr-1 sm:pr-2 -webkit-overflow-scrolling-touch">
                {categories.length === 0 && (
                  <div className="text-sm sm:text-base text-muted-foreground">No categories yet. Add your first one above.</div>
                )}
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 sm:p-2.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors touch-manipulation min-h-[56px]">
                    {editingId === cat.id ? (
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <Input 
                          value={editingName} 
                          onChange={(e) => setEditingName(e.target.value)} 
                          className="bg-white/10 border-white/20 text-white text-base sm:text-base h-10 sm:h-9 touch-manipulation" 
                        />
                        <div className="flex gap-2 sm:gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleRename(cat.id)} 
                            disabled={busyId === cat.id || !editingName.trim()}
                            className="text-base sm:text-base h-10 sm:h-9 px-4 sm:px-4 touch-manipulation"
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => { setEditingId(null); setEditingName(''); }}
                            className="text-base sm:text-base h-10 sm:h-9 px-4 sm:px-4 touch-manipulation"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl">{cat.icon || getIconByCategoryName(cat.name)}</span>
                        <span className="text-sm sm:text-base font-medium">{cat.name}</span>
                      </div>
                    )}
                    {editingId !== cat.id && (
                      <div className="flex flex-row gap-1.5 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openIconPicker(cat)}
                          disabled={busyId === cat.id}
                          className="text-base sm:text-base h-10 sm:h-9 px-3 sm:px-4 touch-manipulation min-w-[44px]"
                          title="Change Icon"
                        >
                          <Image className="w-4 h-4 sm:w-4 sm:h-4" /> 
                          <span className="hidden sm:inline ml-1">Icon</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => startEdit(cat.id, cat.name)}
                          className="text-base sm:text-base h-10 sm:h-9 px-3 sm:px-4 touch-manipulation min-w-[44px]"
                        >
                          <Pencil className="w-4 h-4 sm:w-4 sm:h-4" /> 
                          <span className="hidden sm:inline ml-1">Rename</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDelete(cat.id)} 
                          disabled={busyId === cat.id} 
                          className="hover:bg-red-500/20 hover:text-red-400 text-base sm:text-base h-10 sm:h-9 px-3 sm:px-4 touch-manipulation min-w-[44px]"
                        >
                          <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" /> 
                          <span className="hidden sm:inline ml-1">Delete</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Icon Picker Modal for existing categories */}
      <IconPicker
        isOpen={iconPickerOpen}
        onClose={() => {
          setIconPickerOpen(false)
          setSelectedCategoryForIcon(null)
        }}
        onSelectIcon={handleIconSelect}
        currentIcon={selectedCategoryForIcon?.icon || getIconByCategoryName(selectedCategoryForIcon?.name || '')}
        categoryName={selectedCategoryForIcon?.name}
      />

      {/* Icon Picker Modal for new category */}
      <IconPicker
        isOpen={newCategoryIconPickerOpen}
        onClose={() => setNewCategoryIconPickerOpen(false)}
        onSelectIcon={handleNewCategoryIconSelect}
        currentIcon={newIcon}
        categoryName={newName || 'New Category'}
      />
    </div>
  )
}

export { CategoriesManager }
