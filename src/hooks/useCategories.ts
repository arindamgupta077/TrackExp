import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Category {
  id: string
  name: string
  icon?: string
  created_at: string
}

export const useCategories = (userId: string | undefined) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [hasSeededDefaults, setHasSeededDefaults] = useState(false)
  const { toast } = useToast()

  const migrateLocalStoragePreferences = async () => {
    if (!userId) return
    
    try {
      // Check if user has localStorage preference that needs to be migrated
      const localStoragePreference = localStorage.getItem(`skip_default_categories_${userId}`)
      
      if (localStoragePreference === 'true') {
        // Migrate to database using special category
        const { error } = await supabase
          .from('categories')
          .insert({ 
            user_id: userId, 
            name: '__SKIP_DEFAULT_CATEGORIES__' 
          })
        
        if (!error) {
          // Remove from localStorage after successful migration
          localStorage.removeItem(`skip_default_categories_${userId}`)
          console.log('Migrated localStorage preference to database')
        } else {
          console.error('Failed to migrate localStorage preference:', error)
        }
      }
    } catch (error) {
      console.error('Error migrating localStorage preferences:', error)
    }
  }

  const fetchCategories = async () => {
    if (!userId) {
      setCategories([])
      setLoading(false)
      return
    }

    try {
      // Migrate localStorage preferences to database on first load
      await migrateLocalStoragePreferences()
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      // Filter out special categories (skip marker and Salary)
      const filteredCategories = (data || []).filter(cat => 
        cat.name !== '__SKIP_DEFAULT_CATEGORIES__' && 
        cat.name !== 'Salary'
      )
      setCategories(filteredCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({ title: 'Error', description: 'Failed to load categories', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const seedDefaultsIfEmpty = async () => {
    if (!userId || hasSeededDefaults) return
    
    // Check if user has explicitly chosen to skip default categories
    // We'll use a special category name to track this preference
    try {
      const { data: skipCategory, error } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', '__SKIP_DEFAULT_CATEGORIES__')
        .single()
      
      if (!error && skipCategory) {
        console.log('User has chosen to skip default categories (tracked in database)')
        setHasSeededDefaults(true)
        return
      }
    } catch (error) {
      // Category doesn't exist, which is fine
    }
    
    // Fallback to localStorage for backward compatibility
    const skipDefaults = localStorage.getItem(`skip_default_categories_${userId}`) === 'true'
    if (skipDefaults) {
      console.log('User has chosen to skip default categories (localStorage fallback)')
      setHasSeededDefaults(true)
      return
    }
    
    try {
      // Only seed if currently no categories loaded and we haven't seeded before
      if (categories.length > 0) return
      const defaults = [
        { name: 'Food', icon: '🍽️' },
        { name: 'Transportation', icon: '🚌' },
        { name: 'Shopping', icon: '🛒' },
        { name: 'Entertainment', icon: '🎬' },
        { name: 'Health', icon: '🏥' },
        { name: 'Travel', icon: '✈️' },
        { name: 'Education', icon: '📚' },
        { name: 'Other', icon: '📦' }
      ]
      const rows = defaults.map(cat => ({ user_id: userId, name: cat.name, icon: cat.icon }))
      const { error } = await supabase.from('categories').insert(rows)
      if (error) {
        // Ignore duplicate/unique conflicts silently
        const msg = String((error as Error).message || '')
        if (!msg.includes('duplicate key') && !msg.includes('unique')) {
          throw error
        }
      }
      // Mark that we've seeded defaults for this user
      setHasSeededDefaults(true)
      // Refresh list after seeding
      await fetchCategories()
    } catch (error) {
      console.error('Error seeding default categories:', error)
    }
  }

  const addCategory = async (name: string, icon?: string) => {
    if (!userId) return { error: new Error('User not authenticated') }
    try {
      const trimmed = name.trim()
      if (!trimmed) {
        const error = new Error('Category name cannot be empty')
        toast({ title: 'Invalid name', description: error.message, variant: 'destructive' })
        return { error }
      }

      // Normalize name (capitalize first letter)
      const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)

      // Prevent local duplicates quickly
      const exists = categories.some(c => c.name.toLowerCase() === normalized.toLowerCase())
      if (exists) {
        const error = new Error('Category with this name already exists')
        toast({ title: 'Duplicate category', description: error.message, variant: 'destructive' })
        return { error }
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{ user_id: userId, name: normalized, icon: icon || '📦' }])
        .select()
        .single()
      if (error) throw error
      setCategories(prev => [...prev, data])
      toast({ title: 'Category added', description: `"${normalized}" created.` })
      return { data, error: null }
    } catch (error) {
      console.error('Error adding category:', error)
      let message = 'Failed to add category'
      if (typeof error === 'object' && error && 'message' in error) {
        const msg = String((error as Error).message)
        if (msg.includes('duplicate key') || msg.includes('unique')) {
          message = 'Category with this name already exists'
        }
        if (msg.includes('relation "categories" does not exist')) {
          message = 'Categories table not found. Please run database migrations.'
        }
      }
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return { error }
    }
  }

  const updateCategory = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
      if (error) throw error
      setCategories(prev => prev.map(c => (c.id === id ? { ...c, name } : c)))
      toast({ title: 'Category updated', description: `Renamed to "${name}".` })
      return { error: null }
    } catch (error) {
      console.error('Error updating category:', error)
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' })
      return { error }
    }
  }

  const updateCategoryIcon = async (id: string, icon: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ icon })
        .eq('id', id)
      if (error) throw error
      setCategories(prev => prev.map(c => (c.id === id ? { ...c, icon } : c)))
      toast({ title: 'Icon updated', description: 'Category icon updated successfully.' })
      return { error: null }
    } catch (error) {
      console.error('Error updating category icon:', error)
      toast({ title: 'Error', description: 'Failed to update category icon', variant: 'destructive' })
      return { error }
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      if (error) throw error
      setCategories(prev => prev.filter(c => c.id !== id))
      
      // If this was the last category, allow user to start fresh
      // (don't auto-seed defaults again)
      if (categories.length === 1) {
        setHasSeededDefaults(true)
      }
      
      toast({ title: 'Category deleted', description: 'Category removed successfully.' })
      return { error: null }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' })
      return { error }
    }
  }

  const removeAllDefaultCategories = async () => {
    if (!userId) return { error: new Error('User not authenticated') }
    try {
      console.log('Attempting to remove default categories for user:', userId)
      
      // Define default category names
      const defaultCategoryNames = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Health', 'Travel', 'Education', 'Other']
      
      // Find all default categories for this user
      const defaultCategories = categories.filter(cat => defaultCategoryNames.includes(cat.name))
      
      if (defaultCategories.length === 0) {
        toast({ title: 'No default categories', description: 'No default categories found to remove.', variant: 'default' })
        return { error: null }
      }
      
      // Delete each default category individually
      const deletePromises = defaultCategories.map(cat => 
        supabase.from('categories').delete().eq('id', cat.id)
      )
      
      const results = await Promise.all(deletePromises)
      const errors = results.filter(result => result.error)
      
      if (errors.length > 0) {
        console.error('Some categories failed to delete:', errors)
        throw new Error(`Failed to delete ${errors.length} categories`)
      }
      
      // Store preference in database to prevent re-seeding
      // We'll create a special category to track this preference
      try {
        const { error: prefError } = await supabase
          .from('categories')
          .insert({ 
            user_id: userId, 
            name: '__SKIP_DEFAULT_CATEGORIES__' 
          })
        
        if (prefError) {
          console.error('Error saving user preference:', prefError)
          // Fallback to localStorage
          localStorage.setItem(`skip_default_categories_${userId}`, 'true')
        } else {
          // Remove from localStorage since we're now using database
          localStorage.removeItem(`skip_default_categories_${userId}`)
        }
      } catch (error) {
        console.error('Error saving user preference:', error)
        // Fallback to localStorage
        localStorage.setItem(`skip_default_categories_${userId}`, 'true')
      }
      
      setHasSeededDefaults(true)
      
      // Refresh categories to reflect the changes
      await fetchCategories()
      
      toast({ 
        title: 'Default categories removed', 
        description: `Successfully removed ${defaultCategories.length} default categories. They will not be recreated even after clearing browser cache.` 
      })
      return { error: null }
    } catch (error) {
      console.error('Error removing default categories:', error)
      
      let errorMessage = 'Failed to remove default categories'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = error.message
      }
      
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' })
      return { error }
    }
  }

  const allowDefaultCategories = async () => {
    if (!userId) return { error: new Error('User not authenticated') }
    try {
      // Remove the special category that tracks the skip preference
      const { error: prefError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId)
        .eq('name', '__SKIP_DEFAULT_CATEGORIES__')
      
      if (prefError) {
        console.error('Error updating user preference:', prefError)
        // Fallback to localStorage
        localStorage.removeItem(`skip_default_categories_${userId}`)
      }
      
      setHasSeededDefaults(false)
      
      toast({ title: 'Default categories enabled', description: 'Default categories will be created for new users.' })
      return { error: null }
    } catch (error) {
      console.error('Error enabling default categories:', error)
      toast({ title: 'Error', description: 'Failed to enable default categories', variant: 'destructive' })
      return { error }
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [userId])

  // After initial fetch completes, try to seed defaults for this user if none exist
  useEffect(() => {
    if (!loading && userId && categories.length === 0 && !hasSeededDefaults) {
      seedDefaultsIfEmpty()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId, hasSeededDefaults])

  const resetSeedingFlag = () => {
    setHasSeededDefaults(false)
  }

  return { 
    categories, 
    loading, 
    addCategory, 
    updateCategory, 
    updateCategoryIcon,
    deleteCategory, 
    refetch: fetchCategories,
    resetSeedingFlag,
    removeAllDefaultCategories,
    allowDefaultCategories
  }
}
