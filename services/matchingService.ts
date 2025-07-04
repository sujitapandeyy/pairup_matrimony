
type User = {
  _id: string;
  name: string;
  age: number;
  gender: string;
  religion: string;
  maritalStatus: string;
  location: string;
  education: string;
  profession: string;
  personality: string[];
  hobbies: string[];
  caption: string;
  images: string[];
};

type MatchingCriteria = {
  age_group?: string;
  gender?: string;
  religion?: string;
  interfaith_open?: boolean;
  marital_status?: string;
  personality?: string[];
  hobbies?: string[];
};

export class MatchingService {
  static filterEssentialMatches(user: User, profiles: User[], criteria: MatchingCriteria): User[] {
    return profiles.filter(profile => {
      if (profile._id === user._id) return false;

      if (criteria.age_group) {
        const [minAge, maxAge] = criteria.age_group.split('-').map(Number);
        if (profile.age < minAge || profile.age > maxAge) return false;
      }

      if (criteria.gender && criteria.gender !== 'Any' && profile.gender !== criteria.gender) {
        return false;
      }

      if (criteria.religion && profile.religion !== criteria.religion) {
        if (!criteria.interfaith_open) return false;
      }

      if (criteria.marital_status && profile.maritalStatus !== criteria.marital_status) {
        return false;
      }

      return true;
    });
  }

  // Calculate similarity score using KNN for personality and interests
  static calculateSimilarityScore(user: User, profile: User, criteria: MatchingCriteria): number {
    let score = 0;
    
    // Personality match
    if (criteria.personality && criteria.personality.length > 0) {
      const personalityMatch = profile.personality.filter(trait => 
        criteria.personality?.includes(trait)
      ).length;
      score += (personalityMatch / criteria.personality.length) * 40; // 40% weight
    }
    
    // Hobbies match
    if (criteria.hobbies && criteria.hobbies.length > 0) {
      const hobbiesMatch = profile.hobbies.filter(hobby => 
        criteria.hobbies?.includes(hobby)
      ).length;
      score += (hobbiesMatch / criteria.hobbies.length) * 40; // 40% weight
    }
    
    // Education/profession match (20% weight)
    if (user.education === profile.education) score += 10;
    if (user.profession === profile.profession) score += 10;
    
    return Math.min(100, Math.round(score)); // Cap at 100
  }

  // Get compatible profiles
  static async getCompatibleProfiles(userId: string): Promise<{profile: User, score: number}[]> {
    try {
      // Fetch user data and criteria
      const res = await fetch(`/api/user/match?userId=${userId}`);
      const { user, profiles, criteria } = await res.json();
      
      // First filter by essential constraints
      const filtered = this.filterEssentialMatches(user, profiles, criteria);
      
      // Then calculate scores for remaining profiles
      const scoredProfiles = filtered.map(profile => ({
        profile,
        score: this.calculateSimilarityScore(user, profile, criteria)
      }));
      
      // Sort by score descending
      return scoredProfiles.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error fetching compatible profiles:', error);
      return [];
    }
  }
}