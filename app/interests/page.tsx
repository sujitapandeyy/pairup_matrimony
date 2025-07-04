'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const Button = ({ children, ...props }: any) => (
  <button
    {...props}
    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-xl shadow transition disabled:opacity-50"
  >
    {children}
  </button>
);

const defaultForm = {
  partner_age: '',
  partner_gender: '',
  partner_height: '',
  partner_marital_status: '',
  partner_children: '',
  partner_religion: '',
  partner_interfaith: false,
  partner_caste: '',
  partner_caste_no_bar: false,
  partner_personality: [] as string[],
  partner_hobbies: [] as string[],
  partner_pets: '',
  partner_education: '',
  partner_profession: '',
  partner_family_type: '',
  partner_family_values: '',
  partner_living_pref: '',
  partner_long_distance: '',
};

export default function Interests() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(defaultForm);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pairupUser');
    if (stored) setUser(JSON.parse(stored));
    else router.push('/login');
  }, [router]);

  const toggleMultiSelect = (field: string, value: string) => {
    const selected = formData[field] as string[];
    const updated = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    setFormData({ ...formData, [field]: updated });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5050/api/user/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, ...formData }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        localStorage.setItem('pairupUser', JSON.stringify({ ...user, interests_completed: true }));
        setMessage('Saved! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 1200);
      } else {
        setError(result.message || 'Failed to save.');
      }
    } catch {
      setError('Server error.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Your Basic Preferences',
      fields: (
        <>
          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_age}
            onChange={(e) => setFormData({ ...formData, partner_age: e.target.value })}
          >
            <option value="">Preferred Age Group</option>
            <option>18-24</option>
            <option>25-30</option>
            <option>31-35</option>
            <option>36-40</option>
            <option>40+</option>
          </select>

          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_gender}
            onChange={(e) => setFormData({ ...formData, partner_gender: e.target.value })}
          >
            <option value="">Preferred Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Any</option>
          </select>

          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_height}
            onChange={(e) => setFormData({ ...formData, partner_height: e.target.value })}
          >
            <option value="">Preferred Height</option>
            <option>Short</option>
            <option>Average</option>
            <option>Tall</option>
          </select>

          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_marital_status}
            onChange={(e) => setFormData({ ...formData, partner_marital_status: e.target.value })}
          >
            <option value="">Marital Status</option>
            <option>Single</option>
            <option>Divorced </option>
            <option>Widowed</option>
            <option>Separated</option>
          </select>
        </>
      )
    },
    {
      title: 'Personality & Interests',
      fields: (
        <>
          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_religion}
            onChange={(e) => setFormData({ ...formData, partner_religion: e.target.value })}
          >
            <option value="">Religion</option>
            <option>Hindu</option>
            <option>Muslim</option>
            <option>Christian</option>
            <option>Buddhist</option>
          </select>

          <label className="mb-2 flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.partner_interfaith}
              onChange={() => setFormData({ ...formData, partner_interfaith: !formData.partner_interfaith })}
            />
            <span>Open to Interfaith Marriage</span>
          </label>

          <input
            className="w-full mb-3 px-4 py-2 border border-pink-300 rounded-xl"
            placeholder="Caste / Community (Optional)"
            value={formData.partner_caste}
            onChange={(e) => setFormData({ ...formData, partner_caste: e.target.value })}
          />

          <label className="mb-2 flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.partner_caste_no_bar}
              onChange={() => setFormData({ ...formData, partner_caste_no_bar: !formData.partner_caste_no_bar })}
            />
            <span>Caste No Bar</span>
          </label>

          <p className="font-semibold mt-4 mb-1">Personality Type:</p>
          {['Homebody', 'Social Butterfly', 'Balanced'].map((opt) => (
            <label key={opt} className="block mb-1">
              <input
                type="checkbox"
                checked={formData.partner_personality.includes(opt)}
                onChange={() => toggleMultiSelect('partner_personality', opt)}
              /> {opt}
            </label>
          ))}

          <p className="font-semibold mt-4 mb-1">Hobbies:</p>
        
          {['Traveling', 'Cooking', 'Reading', 'Music', 'Fitness','Pets', 'Movies', 'Art'].map((hobby) => (
            <label key={hobby} className="block mb-1">
              <input
                type="checkbox"
                checked={formData.partner_hobbies.includes(hobby)}
                onChange={() => toggleMultiSelect('partner_hobbies', hobby)}
              /> {hobby}
            </label>
          ))}

          <select
            className="w-full mt-4 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_pets}
            onChange={(e) => setFormData({ ...formData, partner_pets: e.target.value })}
          >
            <option value="">Pets Preference</option>
            <option>Love Them</option>
            <option>Neutral</option>
            <option>Can't Live With</option>
          </select>
        </>
      )
    },
    {
      title: 'Family & Lifestyle Preferences',
      fields: (
        <>
          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_education}
            onChange={(e) => setFormData({ ...formData, partner_education: e.target.value })}
          >
            <option value="">Education Level</option>
            <option>High School</option>
            <option>Diploma</option>
            <option>Bachelor's</option>
            <option>Master's</option>
            <option>PhD</option>
          </select>

          <input
            className="w-full mb-3 px-4 py-2 border border-pink-300 rounded-xl"
            placeholder="Profession (e.g. Software Engineer)"
            value={formData.partner_profession}
            onChange={(e) => setFormData({ ...formData, partner_profession: e.target.value })}
          />

          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_family_type}
            onChange={(e) => setFormData({ ...formData, partner_family_type: e.target.value })}
          >
            <option value="">Family Type</option>
            <option>Joint</option>
            <option>Nuclear</option>
            <option>Other</option>
          </select>

          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_family_values}
            onChange={(e) => setFormData({ ...formData, partner_family_values: e.target.value })}
          >
            <option value="">Family Values</option>
            <option>Traditional</option>
            <option>Moderate</option>
            <option>Liberal</option>
          </select>

          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_living_pref}
            onChange={(e) => setFormData({ ...formData, partner_living_pref: e.target.value })}
          >
            <option value="">Living Preference</option>
            <option>City</option>
            <option>Village</option>
            <option>Abroad</option>
          </select>

          <select
            className="w-full mb-3 px-4 py-2 border border-pink-400 rounded-xl"
            value={formData.partner_long_distance}
            onChange={(e) => setFormData({ ...formData, partner_long_distance: e.target.value })}
          >
            <option value="">Open to Long Distance?</option>
            <option>Yes</option>
            <option>Maybe</option>
            <option>No</option>
          </select>
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-pink-100 via-rose-100 to-yellow-100 p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-pink-700 mb-2 text-center">
          {steps[step].title}
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Step {step + 1} of {steps.length}
        </p>

        <div className="space-y-4">{steps[step].fields}</div>

        {error && <p className="text-red-600 mt-3 text-center">{error}</p>}
        {message && <p className="text-green-600 mt-3 text-center">{message}</p>}

        <div className="flex gap-4 mt-6">
          {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit & Finish'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
