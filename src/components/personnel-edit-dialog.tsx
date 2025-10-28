"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, Upload, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"

interface PersonnelData {
  id: string
  name: string
  employeeId?: string
  role?: string
  position?: string
  department?: string
  accessLevel?: string
  status: string
  isAuthorized: boolean
  photos?: string[]
  currentZone?: string
  createdAt: Date
  requestDate?: Date
}

interface PersonnelEditDialogProps {
  personnel: PersonnelData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const ROLE_OPTIONS = [
  "Engineer",
  "Supervisor",
  "Manager",
  "Technician",
  "Safety Officer",
  "Quality Controller",
  "Operator",
  "Maintenance",
  "Security",
  "Contractor",
]

const ACCESS_LEVEL_OPTIONS = ["basic", "elevated", "admin"]

export function PersonnelEditDialog({
  personnel,
  open,
  onOpenChange,
  onSuccess,
}: PersonnelEditDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    position: "",
    department: "",
    accessLevel: "basic",
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null)

  const utils = trpc.useContext()

  useEffect(() => {
    if (personnel && open) {
      setFormData({
        name: personnel.name || "",
        role: personnel.role || "",
        position: personnel.position || "",
        department: personnel.department || "",
        accessLevel: personnel.accessLevel || "basic",
      })
      setPhotos(personnel.photos || [])
      setSelectedFiles([])
    }
  }, [personnel, open])

  const updatePersonnelMutation = trpc.updatePersonnel.useMutation({
    onSuccess: () => {
      toast.success("Personnel updated successfully")
      utils.getPersonnelBySite.invalidate()
      if (onSuccess) onSuccess()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(`Failed to update personnel: ${error.message}`)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personnel) return

    // First upload any new photos
    if (selectedFiles.length > 0) {
      await handlePhotoUpload()
    }

    // Then update personnel details
    updatePersonnelMutation.mutate({
      id: personnel.id,
      ...formData,
    })
  }

  const handlePhotoUpload = async () => {
    if (!personnel || selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append("photos", file)
      })

      const response = await fetch(`/api/personnel/${personnel.id}/photos`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload photos")
      }

      const data = await response.json()
      setPhotos([...photos, ...data.newPhotos])
      setSelectedFiles([])
      toast.success(`${selectedFiles.length} photo(s) uploaded successfully`)
    } catch (error) {
      toast.error("Failed to upload photos")
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const handlePhotoDelete = async (photoUrl: string) => {
    if (!personnel) return

    setIsDeletingPhoto(photoUrl)
    try {
      const response = await fetch(`/api/personnel/${personnel.id}/photos`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoUrl }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete photo")
      }

      setPhotos(photos.filter((url) => url !== photoUrl))
      toast.success("Photo deleted successfully")
    } catch (error) {
      toast.error("Failed to delete photo")
      console.error(error)
    } finally {
      setIsDeletingPhoto(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`)
        return false
      }
      return true
    })

    if (photos.length + selectedFiles.length + validFiles.length > 5) {
      toast.error("Maximum 5 photos allowed")
      return
    }

    setSelectedFiles([...selectedFiles, ...validFiles])
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  if (!personnel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" key={personnel?.id}>
        <DialogHeader>
          <DialogTitle>Edit Personnel Profile</DialogTitle>
          <DialogDescription>
            Update personnel information and manage photos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  key={`role-${personnel.id}`}
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select
                  key={`access-${personnel.id}`}
                  value={formData.accessLevel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, accessLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Photo Management */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Photos ({photos.length}/5)</h3>

            {/* Existing Photos */}
            {photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {photos.map((photoUrl, index) => (
                  <div key={index} className="relative group">
                    <Avatar className="w-full h-20">
                      <AvatarImage src={photoUrl} alt={`Photo ${index + 1}`} />
                      <AvatarFallback>P{index + 1}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => handlePhotoDelete(photoUrl)}
                      disabled={isDeletingPhoto === photoUrl}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isDeletingPhoto === photoUrl ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Selected files to upload:
                </p>
                <div className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSelectedFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            {photos.length + selectedFiles.length < 5 && (
              <div>
                <Label
                  htmlFor="photo-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                >
                  <Upload className="w-4 h-4" />
                  Add Photos
                </Label>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Max 5 photos, 10MB each
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updatePersonnelMutation.isPending ||
                isUploading ||
                !formData.name ||
                !formData.role
              }
            >
              {updatePersonnelMutation.isPending || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
