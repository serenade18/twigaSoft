import { create } from 'zustand';

export interface Detail {
  title: string;
  description: string;
  points: string[];
}

interface SiteState {
  /** Area of interest preselected in the enquiry form. */
  interest: string;
  /** Content of the details dialog; null when it is closed. */
  detail: Detail | null;
  setInterest: (interest: string) => void;
  openDetail: (detail: Detail) => void;
  closeDetail: () => void;
}

export const useSiteStore = create<SiteState>()(set => ({
  interest: '',
  detail: null,
  setInterest: interest => set({ interest }),
  openDetail: detail => set({ detail }),
  closeDetail: () => set({ detail: null }),
}));
