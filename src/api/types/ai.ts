export interface FaceTemplate {
  id: number;
  public_id: string;
  user_id: number;
  quality: number;
  is_active: boolean;
  enrolled_at: string;
}

export interface FaceDetection {
  id: number;
  detection_uuid: string;
  device_id: number;
  detected_at: string;
  frame_uri: string;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
    [key: string]: unknown;
  };
  detection_conf: number;
  quality: number;
  status: string;
  created_at: string;
}

export interface FaceMatch {
  id: number;
  face_detection_id: number;
  face_template_id: number;
  user_id: number;
  score: number;
  status: string;
  created_at: string;
}

export interface PresenceSession {
  id: number;
  session_uuid: string;
  device_id: number;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SessionIdentification {
  id: number;
  session_id: number;
  user_id: number;
  confidence: number;
  identified_at: string;
}

export interface SessionAttendanceLink {
  id: number;
  session_id: number;
  attendance_record_id: number;
  linked_at: string;
}
