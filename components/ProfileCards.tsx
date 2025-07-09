'use client'

import React, { useEffect, useState } from 'react'
import { Heart, X, MapPin, Briefcase, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const ProfileCards = () => {
  const router = useRouter()
  const [profiles, setProfiles] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed?.email) setEmail(parsed.email)
      } catch {
        toast.error('Error parsing user from localStorage')
      }
    }
  }, [])

  useEffect(() => {
    if (!email) return

    api
      .get(`/matches/get_profiles?email=${encodeURIComponent(email)}`)
      .then((res) => {
        const filteredProfiles = res.data.filter((profile: any) => profile.email !== email)
        setProfiles(filteredProfiles)
        setCurrentIndex(0)
      })
      .catch(() => toast.error('Failed to fetch profiles'))
  }, [email])

  const handleSwipe = async (liked: boolean): Promise<void> => {
    if (profiles.length === 0) return
    const targetProfile = profiles[currentIndex]

    try {
      const res = await api.post('/matches/swipe', {
        swiper_email: email,
        target_email: targetProfile.email,
        liked,
      })

      if (res.status < 200 || res.status >= 300) {
        toast.error('Failed to send request')
        return
      }

      liked ? toast.success('Interest Request sent!') : toast.info('Not Interested!')

      setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex))
      setCurrentIndex((prev) => (prev >= profiles.length - 1 ? 0 : prev))
    } catch {
      toast.error('Failed to store swipe')
    }
  }

  if (!email) return <div className="text-center py-10">Loading user...</div>
  if (profiles.length === 0) return <div className="text-center py-10">No profiles found.</div>

  const currentProfile = profiles[currentIndex]

  const onImageClick = () => {
    if (currentProfile?.id) {
      router.push(`/user/${currentProfile.id}`)
    } else {
      toast.error('User ID not found!')
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden shadow-2xl border-0 bg-white rounded-3xl transform transition-all duration-300 hover:scale-105">
          {/* IMAGE: clickable */}
          <div
            className="relative cursor-pointer"
            onClick={onImageClick}
            aria-label={`View profile of ${currentProfile.name}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onImageClick()
            }}
          >
            <img
              src={currentProfile.images?.[0] || '/default-profile.jpg'}
              alt={currentProfile.name}
              className="w-full h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Overlay info - not clickable */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
              <h2 className="text-3xl font-bold mb-2">
                {currentProfile.name}, {currentProfile.age}
              </h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{(currentProfile.location || '').split(' ').slice(0, 2).join(' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">{currentProfile.profession}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4" />
                  <span className="text-sm">{currentProfile.education}</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM PART: NOT CLICKABLE */}
          <CardContent className="p-6 pointer-events-none">
            <p className="text-gray-700 mb-4 leading-relaxed">
              {currentProfile.bio || currentProfile.caption || ''}
            </p>

            {Array.isArray(currentProfile.personality) && currentProfile.personality.length > 0 && (
              <div className="mt-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Personality Traits</h3>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.personality.map((trait: string, index: number) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* BUTTONS: clickable */}
            <div className="flex justify-center space-x-4 pointer-events-auto">
              <Button
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                  await handleSwipe(false)
                }}
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full border-2 border-gray-300 hover:border-red-400 hover:bg-red-50"
              >
                <X className="w-8 h-8 text-gray-500 hover:text-red-500" />
              </Button>

              <Button
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                  await handleSwipe(true)
                }}
                size="lg"
                className="w-16 h-16 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg hover:scale-110"
              >
                <Heart className="w-8 h-8 text-white" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ProfileCards
