import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Search } from 'lucide-react'
import { allCategoryIcons, searchIcons, type CategoryIcon } from '@/data/categoryIcons'

interface IconPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelectIcon: (icon: string) => void
  currentIcon?: string
  categoryName?: string
}

const IconPicker = ({ isOpen, onClose, onSelectIcon, currentIcon = '📦', categoryName }: IconPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)

  if (!isOpen) return null

  const filteredIcons = searchQuery ? searchIcons(searchQuery) : allCategoryIcons

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon)
  }

  const handleConfirm = () => {
    onSelectIcon(selectedIcon)
    onClose()
  }

  const handleClose = () => {
    setSelectedIcon(currentIcon)
    setSearchQuery('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-2 z-50">
      <Card className="glass-card p-3 sm:p-4 w-full max-w-full sm:max-w-6xl lg:max-w-7xl xl:max-w-[90vw] border-white/20 max-h-[100vh] sm:max-h-[98vh] overflow-hidden flex flex-col mx-2 sm:mx-0">
        <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg lg:text-xl text-white">
              Choose Icon {categoryName && `for ${categoryName}`}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 hover:bg-white/10 touch-manipulation">
              <X className="h-4 w-4 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-white" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Current Selection - Compact Layout */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 flex-shrink-0">
            {/* Search */}
            <div className="flex-1">
              <Label htmlFor="icon-search" className="text-white text-sm sm:text-sm font-medium">Search Icons</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-4 sm:w-4 text-white/60" />
                <Input
                  id="icon-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or emoji..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60 text-base sm:text-sm h-10 sm:h-9 pl-10 sm:pl-8 touch-manipulation"
                />
              </div>
            </div>

            {/* Current Selection */}
            <div className="flex-1">
              <Label className="text-white text-sm sm:text-sm font-medium">Current Selection</Label>
              <div className="flex items-center gap-2 mt-1 p-3 sm:p-3 rounded-lg bg-white/5 border border-white/10 min-h-[48px]">
                <span className="text-2xl sm:text-2xl">{selectedIcon}</span>
                <span className="text-white text-sm sm:text-sm font-medium truncate">
                  {filteredIcons.find(icon => icon.emoji === selectedIcon)?.name || 'Custom Icon'}
                </span>
              </div>
            </div>
          </div>

          {/* Icons Grid */}
          <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch">
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-18 xl:grid-cols-22 gap-2 sm:gap-1.5">
              {filteredIcons.map((icon, index) => (
                <button
                  key={`${icon.emoji}-${index}`}
                  onClick={() => handleIconSelect(icon.emoji)}
                  className={`
                    p-2 sm:p-1.5 rounded-md border transition-all duration-200 hover:scale-110 touch-manipulation min-h-[60px] sm:min-h-[50px]
                    ${selectedIcon === icon.emoji 
                      ? 'border-blue-400 bg-blue-400/20 shadow-md' 
                      : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                    }
                  `}
                  title={`${icon.name} - ${icon.description}`}
                >
                  <div className="flex flex-col items-center gap-1 sm:gap-0.5">
                    <span className="text-2xl sm:text-xl lg:text-2xl block">{icon.emoji}</span>
                    <span className="text-white/70 text-[10px] sm:text-[9px] font-medium text-center leading-tight truncate w-full">
                      {icon.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            {filteredIcons.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white/60 text-sm sm:text-base">No icons found matching your search.</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 mt-4 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12 sm:h-9 text-base sm:text-sm border-white/20 text-white hover:bg-white/10 touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-12 sm:h-9 text-base sm:text-sm touch-manipulation"
            >
              Select Icon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { IconPicker }
