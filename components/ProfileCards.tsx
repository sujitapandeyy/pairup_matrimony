'use client'

import React, { useEffect, useState } from 'react'
import { Heart, X, MapPin, Briefcase, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Badge } from './ui/badge'

const ProfileCards = () => {
  const router = useRouter()
  const [profiles, setProfiles] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [email, setEmail] = useState<string | null>(null)
  const [randomProfiles, setRandomProfiles] = useState<any[]>([])

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

  const fetchSimilarProfiles = async () => {
    if (!email) return

    try {
      // Fetch all available profiles first
      const res = await api.get(`/matches/get_profiles?email=${encodeURIComponent(email)}`)
      const allProfiles = res.data.profiles.filter((p: any) => p.email !== email)
      setProfiles(allProfiles)
      setCurrentIndex(0)

      try {
        // Fetch similar profiles
        const simRes = await api.get(`/matches/similar_to_liked?email=${encodeURIComponent(email)}`)
        let similar = simRes.data || []
        
        if (similar.length < 5) {
          const remaining = 5 - similar.length
          const availableProfiles = allProfiles.filter(
            (p: any) => !similar.some((s: any) => s.email === p.email)
          )
          const random = [...availableProfiles]
            .sort(() => 0.5 - Math.random())
            .slice(0, remaining)
          similar = [...similar, ...random]
        }
        
        setRandomProfiles(similar.slice(0, 5)) 
      } catch {
        const random = [...allProfiles]
          .sort(() => 0.5 - Math.random())
          .slice(0, 5)
        setRandomProfiles(random)
      }
    } catch {
      toast.error('Failed to fetch profiles')
    }
  }

  useEffect(() => {
    if (email) {
      fetchSimilarProfiles()
    }
  }, [email])

  const handleSwipe = async (liked: boolean): Promise<void> => {
    if (profiles.length === 0) return
    const targetProfile = profiles[currentIndex]

    try {
      await api.post('/matches/swipe', {
        swiper_email: email,
        target_email: targetProfile.email,
        liked,
      })

      liked ? toast.success('Interest sent!') : toast.info('Skipped.')

      setProfiles((prev) => {
        const updated = prev.filter((_, idx) => idx !== currentIndex)
        const newIndex = currentIndex >= updated.length ? 0 : currentIndex
        setCurrentIndex(newIndex)
        return updated
      })

      if (liked) {
        await fetchSimilarProfiles()
      } else {
        setRandomProfiles((prev) => {
          let updated = prev.filter((profile) => profile.email !== targetProfile.email)

          if (updated.length < 5) {
            const shownEmails = new Set([
              ...updated.map((p) => p.email),
              targetProfile.email
            ])
            
            const candidatesToAdd = profiles
              .filter(p => !shownEmails.has(p.email))
              .sort(() => 0.5 - Math.random())
              .slice(0, 5 - updated.length)

            updated = [...updated, ...candidatesToAdd]
          }

          return updated.slice(0, 5)
        })
      }
    } catch {
      toast.error('Swipe failed')
    }
  }

  if (!email) return <div className="text-center py-10">Loading user...</div>
  if (profiles.length === 0) return <div className="text-center py-10">No profiles found.</div>

  const currentProfile = profiles[currentIndex]

  const onSmallCardClick = (profile: any) => {
    const idx = profiles.findIndex((p) => p.email === profile.email)
    if (idx !== -1) {
      setCurrentIndex(idx)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setProfiles(prev => [...prev, profile])
      setCurrentIndex(profiles.length)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const onBigImageClick = () => {
    if (currentProfile?.id || currentProfile?.email) {
      router.push(`/user/${currentProfile.id || currentProfile.email}`)
    } else {
      toast.error('User identifier not found')
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10 px-4 py-10 w-full max-w-screen-xl mx-auto" >
      <div className="flex-1 flex justify-center">
        <Card className="w-2/5 max-w-5xl overflow-hidden shadow-2xl border-0 bg-white rounded-3xl">
          <div
            className="relative cursor-pointer"
            onClick={onBigImageClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onBigImageClick()
            }}
          >
            <img
              src={currentProfile.images?.[0] || '/default-profile.jpg'}
              alt={currentProfile.name}
              className="w-full h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
              <h2 className="text-3xl font-bold mb-2">
                {currentProfile.name}, {currentProfile.age}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{(currentProfile.location || '').split(' ').slice(0, 2).join(' ')}</span>
                  <span>{currentProfile.distance_km} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{currentProfile.profession}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>{currentProfile.education}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    className={`text-xs px-2 py-1 text-white ${
                      currentProfile.compatibility_score >= 90
                        ? 'bg-green-700'
                        : currentProfile.compatibility_score >= 80
                        ? 'bg-green-600'
                        : currentProfile.compatibility_score >= 70
                        ? 'bg-green-500'
                        : currentProfile.compatibility_score >= 60
                        ? 'bg-yellow-500'
                        : currentProfile.compatibility_score >= 50
                        ? 'bg-yellow-400'
                        : currentProfile.compatibility_score >= 40
                        ? 'bg-orange-400'
                        : currentProfile.compatibility_score >= 30
                        ? 'bg-orange-500'
                        : currentProfile.compatibility_score >= 20
                        ? 'bg-red-500'
                        : 'bg-red-600'
                    }`}
                  >
                    {currentProfile.compatibility_score}% Compatible
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="text-gray-700 mb-4 leading-relaxed">
              {currentProfile.bio || currentProfile.caption || ''}
            </p>

            {Array.isArray(currentProfile.hobbies) && currentProfile.hobbies.length > 0 && (
              <div className="mt-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Hobbies</h3>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.hobbies.map((hobby: string, i: number) => (
                    <span
                      key={i}
                      className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-6 mt-4">
              <Button
                onClick={async (e) => {
                  e.preventDefault()
                  await handleSwipe(false)
                }}
                variant="outline"
                className="w-14 h-14 rounded-full border-gray-300 hover:border-red-500"
              >
                <X className="w-6 h-6 text-red-500" />
              </Button>

              <Button
                onClick={async (e) => {
                  e.preventDefault()
                  await handleSwipe(true)
                }}
                className="w-14 h-14 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
              >
                <Heart className="w-6 h-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Similar Users Sidebar */}
      <div className="w-full lg:w-[210px] space-y-6">
        <p className="font-bold text-gray-700">You might also Like : </p>
        {randomProfiles.map((profile) => (
          <div
            key={profile.email}
            className={`cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition bg-white flex items-center gap-4 p-3 ${
              profiles[currentIndex]?.email === profile.email ? 'ring-2 ring-gray-500' : ''
            }`}
            onClick={() => onSmallCardClick(profile)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSmallCardClick(profile)
            }}
          >
            <img
              src={profile.images?.[0] || '/default-profile.jpg'}
              alt={profile.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex flex-col">
              <h3 className="font-semibold text-base">{profile.name}</h3>
              <p className="text-xs text-gray-600">
                {profile.age} &middot; {(profile.location || 'Unknown').split(' ').slice(0, 2).join(' ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfileCards
