'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, X, MessageCircle, MapPin, Briefcase, GraduationCap, Badge } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import api from '@/lib/api'

function getFullImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return '/default-profile.jpg'
  if (imagePath.startsWith('/uploads/')) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${imagePath}`
  }
  return imagePath
}

const Requests = () => {
  const router = useRouter()

  const [requests, setRequests] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [email, setEmail] = useState<string | null>(null)
  const [showMatch, setShowMatch] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState<any>(null)
  const [requestToRemoveAfterMatch, setRequestToRemoveAfterMatch] = useState<string | null>(null)

  // Load current user email from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed?.email) setEmail(parsed.email.toLowerCase())
      } catch {
        toast.error('Error parsing user info')
      }
    } else {
      toast.error('Please log in')
      router.push('/login')
    }
  }, [router])

  // Fetch requests for current user
  useEffect(() => {
    if (!email) return

    const fetchRequests = async () => {
      try {
        const res = await api.get(`/matches/notifications`, { params: { email } })
        // Only requests where type is 'request' and to is current user
        const filtered = res.data.filter(
          (n: any) => n.type === 'request' && n.to?.toLowerCase() === email
        )
        setRequests(filtered)
        setCurrentIndex(0)
      } catch {
        toast.error('Failed to load requests')
      }
    }

    fetchRequests()
  }, [email])

  const currentRequest = requests[currentIndex]

  const handleLikeBack = async () => {
    if (!currentRequest) return

    try {
      const res = await api.post('/matches/swipe', {
        swiper_email: email,
        target_email: currentRequest.from,
        liked: true,
      })

      if (res.data.match) {
        setMatchedProfile({
          name: currentRequest.sender_name,
          images: [getFullImageUrl(currentRequest.sender_image)],
          userImage: getFullImageUrl(currentRequest.user_image),
        })
        setShowMatch(true)
        setRequestToRemoveAfterMatch(currentRequest._id)
      } else {
        // Remove this request from list and update index
        const updated = requests.filter(r => r._id !== currentRequest._id)
        setRequests(updated)
        setCurrentIndex(prev => Math.min(prev, updated.length - 1))
        toast.success('Interest sent!')
      }
    } catch {
      toast.error('Failed to send interest')
    }
  }

  const handleIgnore = async () => {
    if (!currentRequest) return
    try {
      await api.delete(`/matches/ignore/${currentRequest._id}`)
      const updated = requests.filter(r => r._id !== currentRequest._id)
      setRequests(updated)
      setCurrentIndex(prev => Math.min(prev, updated.length - 1))
      toast.success('Request ignored')
    } catch {
      toast.error('Failed to ignore request')
    }
  }

  const closeMatchModal = () => {
    setShowMatch(false)
    setMatchedProfile(null)
    if (requestToRemoveAfterMatch) {
      const updated = requests.filter(r => r._id !== requestToRemoveAfterMatch)
      setRequests(updated)
      setCurrentIndex(prev => Math.min(prev, updated.length - 1))
      setRequestToRemoveAfterMatch(null)
    }
  }

  const onSmallCardClick = (idx: number) => {
    setCurrentIndex(idx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!email) return <div className="text-center py-10">Loading user...</div>
  if (requests.length === 0)
    return <div className="text-center py-10">No requests at the moment.</div>

  return (
    <div className="flex flex-col lg:flex-row gap-10 px-4 py-10 w-full max-w-screen-xl mx-auto">
      {/* Main Request Card */}
      <div className="flex-1 flex justify-center">
        <Card className="w-2/5 max-w-xl overflow-hidden shadow-2xl border-0 bg-white rounded-3xl">
          <div
            className="relative cursor-pointer"
            onClick={() => {
              if (currentRequest.sender_id) router.push(`/user/${currentRequest.sender_id}`)
              else toast.error('User ID not found')
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (currentRequest.sender_id) router.push(`/user/${currentRequest.sender_id}`)
              }
            }}
          >
            <img
              src={getFullImageUrl(currentRequest.sender_image)}
              alt={currentRequest.sender_name}
              className="w-full h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
              <h2 className="text-3xl font-bold mb-2">
                {currentRequest.sender_name}, {currentRequest.sender_age}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{(currentRequest.sender_location || '').split(' ').slice(0, 2).join(' ')}</span>
                </div>
                {currentRequest.sender_profession && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>{currentRequest.sender_profession}</span>
                  </div>
                )}
                {currentRequest.sender_education && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>{currentRequest.sender_education}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Badge
                    className={`text-xs px-2 py-1 text-white ${
                      currentRequest.compatibility_score >= 90
                        ? 'bg-green-700'
                        : currentRequest.compatibility_score >= 80
                        ? 'bg-green-600'
                        : currentRequest.compatibility_score >= 70
                        ? 'bg-green-500'
                        : currentRequest.compatibility_score >= 60
                        ? 'bg-yellow-500'
                        : currentRequest.compatibility_score >= 50
                        ? 'bg-yellow-400'
                        : currentRequest.compatibility_score >= 40
                        ? 'bg-orange-400'
                        : currentRequest.compatibility_score >= 30
                        ? 'bg-orange-500'
                        : currentRequest.compatibility_score >= 20
                        ? 'bg-red-500'
                        : 'bg-red-600'
                    }`}
                  >
                    {currentRequest.compatibility_score}% Compatible
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="text-gray-700 mb-4 leading-relaxed">
              {currentRequest.message || 'This user liked your profile!'}
            </p>

            {Array.isArray(currentRequest.sender_hobbies) && currentRequest.sender_hobbies.length > 0 && (
              <div className="mt-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Hobbies</h3>
                <div className="flex flex-wrap gap-2">
                  {currentRequest.sender_hobbies.map((hobby: string, i: number) => (
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
                onClick={handleIgnore}
                variant="outline"
                className="w-14 h-14 rounded-full border-gray-300 hover:border-red-500"
              >
                <X className="w-6 h-6 text-red-500" />
              </Button>

              <Button
                onClick={handleLikeBack}
                className="w-14 h-14 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
              >
                <Heart className="w-6 h-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List (Small Cards) */}
      <div className="w-full lg:w-[210px] space-y-6 overflow-y-auto max-h-[600px]">
        {requests.map((req, idx) => (
          <div
            key={req._id}
            className={`cursor-pointer rounded-lg overflow-hidden shadow-md  transition bg-white flex items-center gap-4 p-3 ${
              idx === currentIndex ? 'ring-2 ring-gray-500' : ''
            }`}
            onClick={() => onSmallCardClick(idx)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onSmallCardClick(idx)
            }}
          >
            <img
              src={getFullImageUrl(req.sender_image)}
              alt={req.sender_name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex flex-col">
              <h3 className="font-semibold text-base">{req.sender_name}</h3>
              <p className="text-xs text-gray-600">
                {req.sender_age} &middot; {(req.sender_location || '').split(' ').slice(0, 2).join(' ')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Match Modal */}
      {showMatch && matchedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center relative shadow-2xl">
            <button
              onClick={closeMatchModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close match modal"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Heart className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">It's a Match!</h2>
              <p className="text-gray-600">You and {matchedProfile.name} have liked each other</p>
            </div>

            <div className="flex items-center justify-center mb-6 space-x-4">
              {/* You */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-200">
                  {matchedProfile.userImage ? (
                    <img
                      src={matchedProfile.userImage}
                      alt="You"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                      You
                    </div>
                  )}
                </div>
                <span className="mt-1 text-sm text-gray-600">You</span>
              </div>

              <Heart className="w-8 h-8 text-rose-500 animate-pulse" />

              {/* Match */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-pink-200">
                  {matchedProfile.images?.[0] ? (
                    <img
                      src={matchedProfile.images[0]}
                      alt={matchedProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                      Match
                    </div>
                  )}
                </div>
                <span className="mt-1 text-sm text-gray-600">{matchedProfile.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  router.push('/chat')
                  closeMatchModal()
                }}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-3 rounded-xl"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Start Chat
              </Button>
              <Button variant="outline" onClick={closeMatchModal} className="w-full">
                Keep Swiping
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Requests
