'use client'

import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Dynamically import to avoid hydration errors
const LocationInput = dynamic(() => import('@/components/LocationInput'), { ssr: false })

export default function Registration() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
const [detailsData, setDetailsData] = useState({
  age: '',
  gender: '',
  religion: '',
  location: '',
  latitude: '',
  longitude: '',
  height: '', 
  maritalStatus: '',
  education: '',
  profession: '',
  personality: [] as string[],
  caption: '',
})


  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<Blob | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('pairupUser')
    if (storedUser) router.push('/dashboard')
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLocationSelect = (loc: { display_name: string; lat: string; lon: string }) => {
  setDetailsData({
    ...detailsData,
    location: loc.display_name,
    latitude: loc.lat,
    longitude: loc.lon,
  })
}

  const handleDetailsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') return
    setDetailsData({ ...detailsData, [name]: value })
  }

  const toggleCheckbox = (item: string) => {
    const updated = detailsData.personality.includes(item)
      ? detailsData.personality.filter((i) => i !== item)
      : [...detailsData.personality, item]
    setDetailsData({ ...detailsData, personality: updated })
  }

  const captureFromWebcam = async () => {
    setResult(null)
    setShowWebcam(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      toast.error('Webcam access denied')
      setShowWebcam(false)
    }
  }

  const stopWebcam = () => {
    setShowWebcam(false)
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const takePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 280, 280)
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            setImageFile(blob)
            setPreviewUrl(URL.createObjectURL(blob))
            sendToBackend(blob)
            stopWebcam()
          }
        }, 'image/jpeg')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      sendToBackend(file)
      stopWebcam()
    }
  }

  const sendToBackend = async (file: Blob | File | null) => {
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch('http://127.0.0.1:5050/face/detect-age', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })
        const data = await res.json()
        const ageData = data.data?.[0]
        if (res.ok && ageData) {
          if (ageData.min_age < 18) {
            toast.error(`Access Denied: ${ageData.age_range}`)
            setResult(`Access Denied. Age range: ${ageData.age_range}`)
          } else {
            toast.success(`Access Granted: ${ageData.age_range}`)
            setResult(`Access Granted. Age range: ${ageData.age_range}`)
          }
        } else {
          toast.error(data.message || 'Detection failed')
        }
      } catch {
        toast.error('Server error')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) return toast.error('Upload or capture an image first')
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch('http://127.0.0.1:5050/face/detect-age', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })
        const data = await res.json()
        const minAge = data.data?.[0]?.min_age
        if (minAge < 18) {
          toast.error('Must be 18+ to register')
          return
        }
        setResult(null)
        setStep(2)
      } catch {
        toast.error('Error contacting server')
      }
    }
    reader.readAsDataURL(imageFile)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const {
      age, gender, religion, location, maritalStatus,
      education, profession, personality, caption,
    } = detailsData

    if (!age || !gender || !religion || !location || !maritalStatus ||
      !education || !profession || personality.length === 0) {
      return toast.error('Fill all required fields')
    }

    if (parseInt(age) < 18) {
      return toast.error('Age must be 18+')
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch('http://localhost:5050/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            image: base64,
            details: detailsData,
          }),
        })

        const data = await res.json()
        if (res.ok && data.success) {
          toast.success('Registration successful!')
          localStorage.setItem('pairupUser', JSON.stringify({
            name: formData.name,
            email: formData.email,
          }))
          router.push('/login')
        } else {
          toast.error(data.message || 'Registration failed')
        }
      } catch {
        toast.error('Server error')
      }
    }
    reader.readAsDataURL(imageFile)
  }

  const interestsList = [
  'Traveling',
  'Cooking',
  'Reading',
  'Music',
  'Fitness',
  'Pets',
  'Movies',
  'Art',
  'Photography',
  'Gardening',
  'Volunteering',
  'Technology',
  'Writing',
  'Dancing',
  'Spirituality',
  'Gaming',
  'Adventure Sports',
  'Fashion',
  'Blogging',
  'Languages'
]

  return (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div className="bg-white shadow-xl rounded-xl max-w-md w-full p-8">
      <h1 className="text-3xl font-serif font-bold text-gray-800 mb-6 text-center">
        💕 PairUp Matrimony
      </h1>

      {step === 1 && (
        <>
          <p className="text-center text-gray-800 mb-8 font-bold">
            Register here and find your perfect match
          </p>
          <form onSubmit={handleNext} className="space-y-6">
            <input
              name="name"
              placeholder="Enter your Full Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Enter your Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Enter your Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            />

            <div className="flex flex-wrap justify-between gap-3 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-lg shadow-md transition"
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={captureFromWebcam}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg shadow-md transition"
              >
                Use Webcam
              </button>
              {showWebcam && (
                <>
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-lg shadow-md transition"
                  >
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg shadow-md transition"
                  >
                    Cancel Webcam
                  </button>
                </>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {showWebcam && (
              <div className="mt-6 flex justify-center">
                <video
                  ref={videoRef}
                  width="280"
                  height="280"
                  className="rounded-lg border-2 border-green-400 shadow-lg"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
            )}
            <canvas ref={canvasRef} width="280" height="280" className="hidden" />

            {previewUrl && (
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Image Preview:</p>
                <img
                  src={previewUrl}
                  alt="Selected Preview"
                  className="inline-block rounded-lg border border-gray-300 max-w-full max-h-56"
                />
              </div>
            )}

            {result && (
              <p
                className={`mt-4 font-semibold text-center ${
                  result.includes('Denied') ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {result}
              </p>
            )}

            {loading && (
              <p className="text-center mt-3 text-gray-600 font-semibold">Processing...</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-900 text-white font-bold py-3 rounded-lg mt-6 transition"
            >
              Next
            </button>

            <p className="mt-4 text-center text-gray-600">
              Already registered?{' '}
              <Link href="/login" className="font-semibold text-green-700 hover:text-green-900">
                Login here
              </Link>
            </p>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-center text-gray-600 mb-8 font-medium">
            Provide your personal details
          </p>

          <form onSubmit={handleFinalSubmit} className="space-y-6">
           <select
            name="age"
            value={detailsData.age}
            onChange={handleDetailsChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            required
          >
            <option value="">Select Age</option>
            {[...Array(40)].map((_, i) => {
              const age = i + 18
              return (
                <option key={age} value={age}>{age}</option>
              )
            })}
          </select>

              
            <select
              name="gender"
              value={detailsData.gender}
              onChange={handleDetailsChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

           <select
            name="religion"
            value={detailsData.religion}
            onChange={handleDetailsChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            required
          >
            <option value="">Select Religion</option>
            <option value="Hindu">Hindu</option>
            <option value="Muslim">Muslim</option>
            <option value="Christian">Christian</option>
            <option value="Sikh">Sikh</option>
            <option value="Buddhist">Buddhist</option>
            <option value="Jain">Jain</option>
            <option value="Other">Other</option>
          </select>

          <select
              name="height"
              value={detailsData.height}
              onChange={handleDetailsChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            >
              <option value="">Select Height</option>
              <option value="4'10&quot; (147 cm)">4'10" (147 cm)</option>
              <option value="4'11&quot; (150 cm)">4'11" (150 cm)</option>
              <option value="5'0&quot; (152 cm)">5'0" (152 cm)</option>
              <option value="5'1&quot; (155 cm)">5'1" (155 cm)</option>
              <option value="5'2&quot; (157 cm)">5'2" (157 cm)</option>
              <option value="5'3&quot; (160 cm)">5'3" (160 cm)</option>
              <option value="5'4&quot; (163 cm)">5'4" (163 cm)</option>
              <option value="5'5&quot; (165 cm)">5'5" (165 cm)</option>
              <option value="5'6&quot; (168 cm)">5'6" (168 cm)</option>
              <option value="5'7&quot; (170 cm)">5'7" (170 cm)</option>
              <option value="5'8&quot; (173 cm)">5'8" (173 cm)</option>
              <option value="5'9&quot; (175 cm)">5'9" (175 cm)</option>
              <option value="5'10&quot; (178 cm)">5'10" (178 cm)</option>
            </select>


            <LocationInput
              value={detailsData.location}
              onSelect={handleLocationSelect}

            />

            <select
              name="maritalStatus"
              value={detailsData.maritalStatus}
              onChange={handleDetailsChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            >
              <option value="">Select Marital Status</option>
              <option value="Single">Single</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>

            <input
              type="text"
              name="education"
              placeholder="Enter your Education"
              value={detailsData.education}
              onChange={handleDetailsChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            />

            <input
              type="text"
              name="profession"
              placeholder="Enter your Profession"
              value={detailsData.profession}
              onChange={handleDetailsChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              required
            />

            <div>
              <p className="mb-2 font-semibold">Select your Interests:</p>
              <div className="flex flex-wrap gap-2">
                {interestsList.map((item) => (
                  <label
                    key={item}
                    className={`cursor-pointer rounded-lg px-4 py-2 border ${
                      detailsData.personality.includes(item)
                        ? 'bg-green-700 text-white border-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-green-100'
                    } transition`}
                  >
                    <input
                      type="checkbox"
                      name="personality"
                      value={item}
                      checked={detailsData.personality.includes(item)}
                      onChange={() => toggleCheckbox(item)}
                      className="hidden"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <input
              type="text"
              name="caption"
              placeholder="Write a short caption about yourself"
              value={detailsData.caption}
              onChange={(e) =>
                setDetailsData({ ...detailsData, caption: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              maxLength={100}
            />

            {loading && (
              <p className="text-center mt-3 text-gray-600 font-semibold">Processing...</p>
            )}

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="w-1/2 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 rounded-lg transition"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-1/2 bg-green-700 hover:bg-green-900 text-white font-bold py-3 rounded-lg transition"
              >
                Register
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  </div>

  )
}
