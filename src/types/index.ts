export interface BookMeta {
  title: string;
  author: string;
  publisher?: string;
  description?: string;
  language: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Volume {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface ParseResult {
  volumes: Volume[];
  chapters: Chapter[];
  hasVolumeStructure: boolean;
}
