export interface Profile {
  name: string;
  email: string;
  photo?: string | null;
  interestsCompleted: boolean;
  age?: string;
  location?: string;
  fullLocation?: string;
  coordinates?: number[];
  maritalStatus?: string;
  gender?: string;
  personality?: string[];
  religion?: string;
  education?: string;
  profession?: string;
  caption?: string;
  lookingFor?: Record<string, any>;
}

export interface ProfilePageProps {
  userId: string;
}