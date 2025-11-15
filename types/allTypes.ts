export const interestForm = {
  partner_age: "",
  partner_age_from: "",
  partner_age_to: "",
  partner_gender: "",
  partner_height: "",
  partner_height_to: "",
  partner_height_from: "",
  partner_marital_status: [] as string[],
  partner_religion: [] as string[],
  partner_caste: [] as string[],
  partner_personality: "",
  partner_pets: "",
  partner_education: "",
  partner_profession: "",
  partner_family_type: "",
  partner_family_values: "",
  partner_living_pref: "",
  partner_long_distance: "",
};

export interface Profile {
  id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  photos: string[];
  profession?: string;
  compatibility_score?: number;
  created_at?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}


