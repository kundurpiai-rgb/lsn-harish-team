import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  Camera,
  Users,
  Settings,
  ShieldCheck,
  Phone,
  User,
  AlertTriangle,
  Wrench,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  Search,
  X,
  RefreshCw,
  Check,
  Database,
  Activity,
  FileText,
  Trash2,
  Upload,
  FileSpreadsheet,
  Edit3,
  Filter,
  ShieldAlert,
  Zap,
  Truck,
  Plus,
  Download,
  Eye,
  Maximize2,
  TrendingUp,
  Clock,
  PhoneCall,
  CheckSquare,
  Square,
  LifeBuoy,
  MessageSquare,
  Send,
  UserCheck,
  Briefcase,
  Mail,
  LogOut,
  Lock,
  LogIn
} from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface PhotoStep {
  id: 'selfie' | 'front' | 'back' | 'left' | 'right';
  label: string;
  desc: string;
  facing: 'user' | 'environment';
}

const PHOTO_STEPS: PhotoStep[] = [
  { id: 'selfie', label: '1. Rider Live Selfie', desc: 'Take face photo standing next to vehicle', facing: 'user' },
  { id: 'front', label: '2. Bike Front View', desc: 'Capture headlight & front license plate', facing: 'environment' },
  { id: 'back', label: '3. Bike Rear View', desc: 'Capture tail light, indicator & rear plate', facing: 'environment' },
  { id: 'left', label: '4. Bike Left Side View', desc: 'Capture complete left body panel & tires', facing: 'environment' },
  { id: 'right', label: '5. Bike Right Side View', desc: 'Capture complete right body panel & motor', facing: 'environment' }
];

interface Rider {
  id?: string;
  rider_name: string;
  phone: string;
  rider_id: string;
  vehicle_number: string;
  vehicle_type: string;
  hub: string;
  status?: string;
}

interface InspectionReport {
  id?: string;
  rider_name: string;
  phone?: string;
  rider_phone?: string;
  vehicle_number: string;
  status: string;
  return_reason: string;
  photos?: { [key: string]: string };
  selfie_url?: string;
  front_url?: string;
  back_url?: string;
  left_url?: string;
  right_url?: string;
  inspection_date?: string;
  created_at?: string;
}

interface IssueTicket {
  id?: string;
  ticket_number: string;
  issue_type: string;
  rider_name: string;
  phone: string;
  vehicle_number: string;
  priority: string;
  description: string;
  status: string;
  created_at?: string;
}

interface RiderLead {
  id?: string;
  lead_name: string;
  phone: string;
  preferred_hub: string;
  source: string;
  stage: 'Lead' | 'Interviewed' | 'Document Verified' | 'Ready for Mapping';
  created_at?: string;
}

interface AuthUser {
  name: string;
  phone: string;
  role: 'rider' | 'tl' | 'admin';
  vehicle_number?: string;
  hub?: string;
  rider_id?: string;
  username?: string;
}

export default function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('fleetguard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginTab, setLoginTab] = useState<'rider' | 'tl'>('rider');
  const [loginPhoneOrId, setLoginPhoneOrId] = useState('');
  const [tlEmail, setTlEmail] = useState('');
  const [tlPassword, setTlPassword] = useState('');

  // Settings / Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [opsEmail, setOpsEmail] = useState(() => localStorage.getItem('fleetguard_ops_email') || 'harish.kundurpi@loadshare.net');
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'demo' | 'connected'>('demo');

  // Unified Sidebar Navigation & Public Mode State
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedUser = localStorage.getItem('fleetguard_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        return u.role === 'rider' ? 'inspection' : 'submitted';
      } catch (e) {}
    }
    return 'submitted';
  });
  const [isPublicMode, setIsPublicMode] = useState<boolean>(true);

  // Admin TL Account Management State
  const [isManageTlModalOpen, setIsManageTlModalOpen] = useState(false);
  const [appUsersList, setAppUsersList] = useState<any[]>([
    { username: 'harish.kundurpi@loadshare.net', email: 'harish.kundurpi@loadshare.net', password: 'admin123', name: 'Harish Kundurpi (Super Admin)', role: 'admin', hub: 'All Hubs', created_at: new Date().toISOString() },
    { username: 'sunil9945868340@gmail.com', email: 'sunil9945868340@gmail.com', password: 'Tl@123', name: 'Sunil TL', role: 'tl', hub: 'Hosa Road', created_at: new Date().toISOString() },
    { username: 'rb5501103@gmail.com', email: 'rb5501103@gmail.com', password: 'Tl@123', name: 'RB TL', role: 'tl', hub: 'Hongasandra', created_at: new Date().toISOString() },
    { username: 'suhaslucky25@gmail.com', email: 'suhaslucky25@gmail.com', password: 'Tl@123', name: 'Suhas TL', role: 'tl', hub: 'Hoodi', created_at: new Date().toISOString() }
  ]);
  // Rider Inspection Form State
  const [selectedStatus, setSelectedStatus] = useState<string>('Working/Active');
  const [returnReason, setReturnReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  // Camera & Photo State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [capturedPhotos, setCapturedPhotos] = useState<{ [key: string]: string }>({});
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Success State
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [lastSubmission, setLastSubmission] = useState<InspectionReport | null>(null);

  // TL Ops Portal State & Filters
  const [selectedHub, setSelectedHub] = useState<string>('ALL');
  const [tlSubTab, setTlSubTab] = useState<'submitted' | 'pending' | 'roster' | 'tickets' | 'sourcing' | 'tl_management'>('submitted');
  const [rosterSearch, setRosterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Photo Enlarge Modal State
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  // Single Onboard Form State
  const [onboardName, setOnboardName] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardRiderId, setOnboardRiderId] = useState('');
  const [onboardVehicle, setOnboardVehicle] = useState('');
  const [onboardVehicleType, setOnboardVehicleType] = useState('Motorbike');
  const [onboardHub, setOnboardHub] = useState('Indiranagar Hub');

  // Edit Mapping Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);

  // Bulk CSV Import State
  const [csvParsedData, setCsvParsedData] = useState<Rider[]>([]);
  const [isCsvPreviewOpen, setIsCsvPreviewOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // TL Issue Ticket Form State
  const [ticketType, setTicketType] = useState('ID Transfer Issue');
  const [ticketRiderName, setTicketRiderName] = useState('');
  const [ticketPhone, setTicketPhone] = useState('');
  const [ticketVehicle, setTicketVehicle] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Normal');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketAttachment, setTicketAttachment] = useState<File | null>(null);
  const [lastTicketNum, setLastTicketNum] = useState<string | null>(null);

  // Rider Sourcing Form State
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadHub, setLeadHub] = useState('Indiranagar Hub');
  const [leadSource, setLeadSource] = useState('Referral');
  const [leadStage, setLeadStage] = useState<'Lead' | 'Interviewed' | 'Document Verified' | 'Ready for Mapping'>('Lead');
  const [leadFilterStage, setLeadFilterStage] = useState<string>('ALL');

  // Data Store
  const [ridersList, setRidersList] = useState<Rider[]>([
    { id: '1', rider_name: 'Rajesh Kumar', phone: '9876543210', rider_id: 'R-1001', vehicle_number: 'KA-01-EQ-4521', vehicle_type: 'EV Scooter', hub: 'Hosa Road', status: 'Active' },
    { id: '2', rider_name: 'Amit Verma', phone: '9812345678', rider_id: 'R-1002', vehicle_number: 'KA-05-EV-8890', vehicle_type: 'Motorbike', hub: 'Hongasandra', status: 'Active' },
    { id: '3', rider_name: 'Suresh Raina', phone: '9745612309', rider_id: 'R-1003', vehicle_number: 'KA-03-EV-1142', vehicle_type: 'Cargo Van', hub: 'Hoodi', status: 'Unmapped' },
    { id: '4', rider_name: 'Priya Sharma', phone: '9988776655', rider_id: 'R-1004', vehicle_number: 'KA-03-EV-9988', vehicle_type: 'Motorbike', hub: 'Kanakpura', status: 'Grounded' }
  ]);
  const [inspectionsList, setInspectionsList] = useState<InspectionReport[]>([]);
  const [ticketsList, setTicketsList] = useState<IssueTicket[]>([
    { id: '1', ticket_number: 'TICK-9021', issue_type: 'Wallet / Balance Issue', rider_name: 'Rahul Dravid', phone: '9811122233', vehicle_number: 'KA-01-AB-1234', priority: 'Urgent', description: 'Wallet payout stuck for 2 days after shift end.', status: 'Open', created_at: new Date().toISOString() }
  ]);
  const [leadsList, setLeadsList] = useState<RiderLead[]>([
    { id: '1', lead_name: 'Karan Singh', phone: '9777888999', preferred_hub: 'Hosa Road', source: 'Referral', stage: 'Ready for Mapping', created_at: new Date().toISOString() },
    { id: '2', lead_name: 'Vikas Malhotra', phone: '9666555444', preferred_hub: 'Hoodi', source: 'Walk-in', stage: 'Document Verified', created_at: new Date().toISOString() }
  ]);

  // Initialize Supabase from LocalStorage on mount & set up real-time polling
  useEffect(() => {
    const savedUrl = 'https://jqtasgezlxstgqxxdmgr.supabase.co';
    const savedKey = 'sb_publishable_7_9rttKkrxApNKHVsrlfbg_bZUEzy5r';
    if (savedUrl && savedKey) {
      setSupabaseUrl(savedUrl);
      setSupabaseKey(savedKey);
      try {
        const client = createClient(savedUrl, savedKey);
        setSupabaseClient(client);
        setConnectionStatus('connected');
        fetchSupabaseData(client);
      } catch (err) {
        console.error('Failed to init Supabase', err);
      }
    }
  }, []);

  // Real-Time Auto-Refresh Polling (15s interval)
  useEffect(() => {
    if (!supabaseClient) return;
    const interval = setInterval(() => {
      fetchSupabaseData(supabaseClient);
    }, 15000);
    return () => clearInterval(interval);
  }, [supabaseClient]);

  const handleSaveConfig = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      alert('Please enter both Supabase URL and Key.');
      return;
    }
    localStorage.setItem('fleetguard_sb_url', supabaseUrl.trim());
    localStorage.setItem('fleetguard_sb_key', supabaseKey.trim());
    localStorage.setItem('fleetguard_ops_email', opsEmail.trim());
    try {
      const client = createClient(supabaseUrl.trim(), supabaseKey.trim());
      setSupabaseClient(client);
      setConnectionStatus('connected');
      fetchSupabaseData(client);
      setIsConfigOpen(false);
      alert('Settings saved & Supabase connected successfully!');
    } catch (err: any) {
      alert('Connection error: ' + err.message);
    }
  };

  const fetchSupabaseData = async (client: SupabaseClient) => {
    try {
      const { data: ridersData } = await client.from('riders').select('*');
      if (ridersData && ridersData.length > 0) {
        setRidersList(ridersData);
      }
      const { data: inspData } = await client
        .from('daily_inspections')
        .select('*')
        .order('created_at', { ascending: false });
      if (inspData) {
        setInspectionsList(inspData);
      }
      const { data: tickData } = await client
        .from('tl_issue_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (tickData) {
        setTicketsList(tickData);
      }
      const { data: leadData } = await client
        .from('rider_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (leadData) {
        setLeadsList(leadData);
      }
      const { data: usersData } = await client.from('app_users').select('*');
      if (usersData && usersData.length > 0) {
        setAppUsersList(usersData);
      }
    } catch (e) {
      console.warn('Supabase fetch notice: tables might need setup.', e);
    }
  };

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setIsCameraActive(false);
  };

  // Login Handlers (Zero-Cost Authentication)
  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = loginPhoneOrId.trim();
    if (!query) {
      alert('Please enter your 10-digit registered phone number.');
      return;
    }

    const cleanQuery = query.replace(/\D/g, '').slice(-10);
    let foundRider = null;

    if (supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('riders')
          .select('*')
          .eq('phone', cleanQuery);
        if (data && data.length > 0) {
          const r = data[0];
          if (r.status === 'Inactive' || r.status === 'Grounded') {
            alert('Access Denied: Phone number not mapped or deactivated by TL.');
            return;
          }
          foundRider = r;
        }
      } catch (e) {
        console.warn('Supabase rider lookup error', e);
      }
    }

    if (!foundRider) {
      foundRider = ridersList.find(
        (r) => r.phone === cleanQuery || (r.rider_id && r.rider_id.toLowerCase() === query.toLowerCase())
      );
    }

    if (foundRider) {
      if (foundRider.status === 'Inactive') {
        alert('Access Denied: Phone number not mapped by TL.');
        return;
      }
      const userObj: AuthUser = {
        name: foundRider.rider_name,
        phone: foundRider.phone,
        role: 'rider',
        vehicle_number: foundRider.vehicle_number || 'KA-01-EQ-9999',
        hub: foundRider.hub || 'Indiranagar Hub',
        rider_id: foundRider.rider_id
      };
      setCurrentUser(userObj);
      localStorage.setItem('fleetguard_user', JSON.stringify(userObj));
      setActiveTab('inspection');
    } else {
      alert('Access Denied: Phone number not mapped by TL.');
    }
  };

  const handleTlLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = tlEmail.trim().toLowerCase();
    const pwd = tlPassword.trim();
    if (!email || !pwd) {
      alert('Please enter Email ID and Password.');
      return;
    }

    let foundUser = null;
    if (supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('app_users')
          .select('*')
          .or(`username.ilike.${email},email.ilike.${email}`)
          .eq('password', pwd);
        if (data && data.length > 0) {
          foundUser = data[0];
        }
      } catch (err) {
        console.warn('Supabase app_users query warning', err);
      }
    }

    if (!foundUser) {
      foundUser = appUsersList.find(
        (u) =>
          (String(u.username || '').toLowerCase() === email ||
            String(u.email || '').toLowerCase() === email) &&
          u.password === pwd
      );
    }

    const isSuperAdmin =
      email === 'harish.kundurpi@loadshare.net' ||
      foundUser?.username?.toLowerCase() === 'harish.kundurpi@loadshare.net' ||
      foundUser?.role === 'admin';

    if (foundUser) {
      const userObj: AuthUser = {
        name: foundUser.name || email.split('@')[0].toUpperCase(),
        phone: foundUser.phone || '9800000000',
        role: isSuperAdmin ? 'admin' : 'tl',
        hub: foundUser.hub || 'All Hubs',
        username: email
      };
      setCurrentUser(userObj);
      localStorage.setItem('fleetguard_user', JSON.stringify(userObj));
      setActiveTab('submitted');
    } else {
      alert('Login Failed: Invalid Email ID or Password.');
    }
  };
  const handleAddTlAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTlUsername || !newTlPassword || !newTlName) {
      alert('Please fill out all TL account fields.');
      return;
    }

    const newAcc = {
      username: newTlUsername.trim().toLowerCase(),
      password: newTlPassword.trim(),
      name: newTlName.trim(),
      hub: newTlHub,
      role: newTlRole
    };

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('app_users').upsert([newAcc], { onConflict: 'username' });
        if (error) throw error;
        alert('TL account created successfully in Supabase!');
        const { data } = await supabaseClient.from('app_users').select('*');
        if (data) setAppUsersList(data);
      } catch (err: any) {
        alert('Error saving TL account: ' + err.message);
      }
    } else {
      setAppUsersList((prev) => [...prev, newAcc]);
      alert('TL account added successfully (Demo Mode)!');
    }

    setNewTlUsername('');
    setNewTlPassword('');
    setNewTlName('');
  };

  const handleDeleteTlAccount = async (username: string) => {
    if (!confirm(`Delete TL account ${username}?`)) return;
    if (supabaseClient) {
      await supabaseClient.from('app_users').delete().eq('username', username);
      const { data } = await supabaseClient.from('app_users').select('*');
      if (data) setAppUsersList(data);
    }
    setAppUsersList((prev) => prev.filter((u) => u.username !== username));
  };

  const handleLogout = () => {
    stopCamera();
    setCurrentUser(null);
    localStorage.removeItem('fleetguard_user');
  };

  // Camera Management
  const startCamera = async (facing: 'user' | 'environment') => {
    stopCamera();
    try {
      setCurrentFacingMode(facing);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setMediaStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied or unavailable. Please check browser permissions.');
      console.error(err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !currentUser) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Watermark
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, canvas.height - 45, canvas.width, 45);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(
      `LSN HARISH TEAM | ${new Date().toLocaleTimeString()} | ${currentUser.vehicle_number || 'VEHICLE'} | ${PHOTO_STEPS[currentStepIndex].label}`,
      15,
      canvas.height - 18
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const stepId = PHOTO_STEPS[currentStepIndex].id;

    setCapturedPhotos((prev) => ({ ...prev, [stepId]: dataUrl }));
    stopCamera();

    // Auto advance
    if (currentStepIndex < PHOTO_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // Validation for form submission
  const photoCount = Object.keys(capturedPhotos).length;
  const isReasonValid =
    selectedStatus === 'Working/Active' ||
    (returnReason !== '' && (returnReason !== 'Other Reason' || customReason.trim() !== ''));
  const canSubmit = currentUser !== null && photoCount === 5 && isReasonValid;

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !currentUser) return;

    const finalReason =
      selectedStatus === 'Working/Active'
        ? 'N/A - Active Shift'
        : returnReason === 'Other Reason'
        ? customReason
        : returnReason;

    const dateStr = new Date().toISOString().split('T')[0];
    let photoUrls = { ...capturedPhotos };

    if (supabaseClient) {
      try {
        for (const [angle, base64] of Object.entries(capturedPhotos)) {
          const res = await fetch(base64);
          const blob = await res.blob();
          const filePath = `${dateStr}/${currentUser.phone}_${angle}_${Date.now()}.jpg`;

          const { error: uploadErr } = await supabaseClient.storage
            .from('inspection-photos')
            .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

          if (!uploadErr) {
            const { data: publicUrlData } = supabaseClient.storage
              .from('inspection-photos')
              .getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
              photoUrls[angle] = publicUrlData.publicUrl;
            }
          }
        }

        await supabaseClient.from('daily_inspections').insert([
          {
            rider_phone: currentUser.phone,
            rider_name: currentUser.name,
            vehicle_number: currentUser.vehicle_number || 'KA-01-EQ-9999',
            status: selectedStatus,
            return_reason: finalReason,
            selfie_url: photoUrls.selfie || '',
            front_url: photoUrls.front || '',
            back_url: photoUrls.back || '',
            left_url: photoUrls.left || '',
            right_url: photoUrls.right || '',
            inspection_date: dateStr
          }
        ]);
        fetchSupabaseData(supabaseClient);
      } catch (err) {
        console.error('Supabase upload error, using local fallback state', err);
      }
    }

    const newReport: InspectionReport = {
      id: 'INS-' + Date.now().toString().slice(-4),
      rider_name: currentUser.name,
      phone: currentUser.phone,
      vehicle_number: currentUser.vehicle_number || 'KA-01-EQ-9999',
      status: selectedStatus,
      return_reason: finalReason,
      photos: photoUrls,
      created_at: new Date().toISOString()
    };

    setInspectionsList((prev) => [newReport, ...prev]);
    setLastSubmission(newReport);
    setIsSubmitted(true);
  };

  const handleResetForm = () => {
    setCapturedPhotos({});
    setCurrentStepIndex(0);
    setSelectedStatus('Working/Active');
    setReturnReason('');
    setCustomReason('');
    setIsSubmitted(false);
    setLastSubmission(null);
    stopCamera();
  };

  // TL Single Onboard Rider
  const handleOnboardRider = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = onboardPhone.replace(/\D/g, '').slice(-10);
    const cleanPlate = onboardVehicle.trim().toUpperCase();

    if (!onboardName || cleanPhone.length < 10 || !cleanPlate) {
      alert('Please fill out all required fields with a valid 10-digit phone number and vehicle plate.');
      return;
    }

    const newRider: Rider = {
      rider_name: onboardName.trim(),
      phone: cleanPhone,
      rider_id: onboardRiderId.trim() || `R-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicle_number: cleanPlate,
      vehicle_type: onboardVehicleType,
      hub: onboardHub,
      status: 'Active'
    };

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('riders').upsert([newRider], { onConflict: 'phone' });
        if (error) throw error;
        alert(`Rider ${newRider.rider_name} upserted successfully to Supabase!`);
        fetchSupabaseData(supabaseClient);
      } catch (err: any) {
        alert('Supabase onboard error: ' + err.message);
      }
    } else {
      setRidersList((prev) => {
        const existingIdx = prev.findIndex((r) => r.phone === newRider.phone);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newRider;
          return updated;
        }
        return [{ id: Date.now().toString(), ...newRider }, ...prev];
      });
      alert(`Rider ${newRider.rider_name} onboarded (Demo Mode)!`);
    }

    setOnboardName('');
    setOnboardPhone('');
    setOnboardRiderId('');
    setOnboardVehicle('');
  };

  // Submit Issue Ticket with Mailto Dispatch & Backend Insert
  const handleIssueTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = ticketPhone.replace(/\D/g, '').slice(-10);
    if (!ticketRiderName || cleanPhone.length < 10 || !ticketDesc) {
      alert('Please fill out all required ticket fields correctly.');
      return;
    }

    const ticketNum = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestampStr = new Date().toLocaleString();
    const newTicket: IssueTicket = {
      ticket_number: ticketNum,
      issue_type: ticketType,
      rider_name: ticketRiderName.trim(),
      phone: cleanPhone,
      vehicle_number: ticketVehicle.trim().toUpperCase() || 'N/A',
      priority: ticketPriority,
      description: ticketDesc.trim(),
      status: 'Open',
      created_at: new Date().toISOString()
    };

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('tl_issue_tickets').insert([newTicket]);
        if (error) throw error;
        fetchSupabaseData(supabaseClient);
      } catch (err: any) {
        console.error('Supabase ticket error', err);
      }
    }

    setTicketsList((prev) => [newTicket, ...prev]);
    setLastTicketNum(ticketNum);

    const subject = encodeURIComponent(`[TL ALERT - ${ticketPriority}] ${ticketType} - ${ticketRiderName.trim()} (${ticketVehicle.trim().toUpperCase() || 'N/A'})`);
    const body = encodeURIComponent(
      `Ticket ID: ${ticketNum}\nIssue Type: ${ticketType}\nPriority Level: ${ticketPriority}\nRider Name: ${ticketRiderName.trim()}\nPhone: ${cleanPhone}\nVehicle Plate #: ${ticketVehicle.trim().toUpperCase() || 'N/A'}\nTimestamp: ${timestampStr}\n\nIssue Description:\n${ticketDesc.trim()}`
    );

    const mailtoUrl = `mailto:${opsEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    alert("Ticket created in backend & draft opened in email client!");

    setTicketRiderName('');
    setTicketPhone('');
    setTicketVehicle('');
    setTicketDesc('');
  };

  // Submit Rider Lead
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = leadPhone.replace(/\D/g, '').slice(-10);
    if (!leadName || cleanPhone.length < 10) {
      alert('Please provide valid lead name and 10-digit contact number.');
      return;
    }

    const newLead: RiderLead = {
      lead_name: leadName.trim(),
      phone: cleanPhone,
      preferred_hub: leadHub,
      source: leadSource,
      stage: leadStage,
      created_at: new Date().toISOString()
    };

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('rider_leads').insert([newLead]);
        if (error) throw error;
        fetchSupabaseData(supabaseClient);
      } catch (e) {
        console.error('Lead insert error', e);
      }
    }

    setLeadsList((prev) => [newLead, ...prev]);
    setLeadName('');
    setLeadPhone('');
    alert(`Rider lead ${newLead.lead_name} successfully added to sourcing pipeline!`);
  };

  // Convert Lead to Fleet Rider
  const handleConvertLeadToRider = async (lead: RiderLead) => {
    const assignedPlate = prompt(`Enter Vehicle Plate Number to map for ${lead.lead_name}:`, 'KA 01 EV 5521');
    if (!assignedPlate) return;

    const newRider: Rider = {
      rider_name: lead.lead_name,
      phone: lead.phone,
      rider_id: `R-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicle_number: assignedPlate.trim().toUpperCase(),
      vehicle_type: 'EV Scooter',
      hub: lead.preferred_hub,
      status: 'Active'
    };

    if (supabaseClient) {
      try {
        await supabaseClient.from('riders').upsert([newRider], { onConflict: 'phone' });
        await supabaseClient.from('rider_leads').delete().eq('phone', lead.phone);
        fetchSupabaseData(supabaseClient);
      } catch (e) {
        console.error('Lead conversion error', e);
      }
    }

    setRidersList((prev) => [newRider, ...prev]);
    setLeadsList((prev) => prev.filter((l) => l.phone !== lead.phone));
    alert(`Successfully mapped ${lead.lead_name} to vehicle ${newRider.vehicle_number}! Added to Active Fleet.`);
  };

  // Bulk CSV Parser & Importer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
      if (lines.length < 2) {
        alert('CSV file appears empty or invalid.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]+/g, ''));
      const parsed: Rider[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((val) => val.trim().replace(/['"]+/g, ''));
        if (row.length < headers.length) continue;

        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = row[idx] || '';
        });

        const name = rowObj['rider_name'] || rowObj['name'] || 'Unknown Rider';
        const phone = (rowObj['phone'] || rowObj['mobile'] || '').replace(/\D/g, '').slice(-10);
        const riderId = rowObj['rider_id'] || rowObj['id'] || `R-${1000 + i}`;
        const vehicleNumber = (rowObj['vehicle_number'] || rowObj['vehicle'] || rowObj['plate'] || '').toUpperCase();
        const vehicleType = rowObj['vehicle_type'] || rowObj['type'] || 'Motorbike';
        const hub = rowObj['hub'] || rowObj['hub_location'] || 'Indiranagar Hub';

        if (phone.length === 10) {
          parsed.push({
            rider_name: name,
            phone,
            rider_id: riderId,
            vehicle_number: vehicleNumber,
            vehicle_type: vehicleType,
            hub,
            status: vehicleNumber ? 'Active' : 'Unmapped'
          });
        }
      }

      if (parsed.length === 0) {
        alert('No valid riders found in CSV. Ensure columns include name, phone, vehicle_number.');
        return;
      }

      setCsvParsedData(parsed);
      setIsCsvPreviewOpen(true);
    };
    reader.readAsText(file);
  };

  const confirmBulkImport = async () => {
    setIsImporting(true);
    setImportProgress(0);

    const batchSize = 50;
    let successCount = 0;

    for (let i = 0; i < csvParsedData.length; i += batchSize) {
      const chunk = csvParsedData.slice(i, i + batchSize);

      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.from('riders').upsert(chunk, { onConflict: 'phone' });
          if (!error) successCount += chunk.length;
        } catch (e) {
          console.error('Batch upsert error', e);
        }
      } else {
        successCount += chunk.length;
      }

      setImportProgress(Math.round(((i + chunk.length) / csvParsedData.length) * 100));
    }

    if (supabaseClient) {
      fetchSupabaseData(supabaseClient);
    } else {
      setRidersList((prev) => {
        const map = new Map(prev.map((r) => [r.phone, r]));
        csvParsedData.forEach((r) => map.set(r.phone, r));
        return Array.from(map.values());
      });
    }

    setIsImporting(false);
    setIsCsvPreviewOpen(false);
    setCsvParsedData([]);
    alert(`Successfully imported / upserted ${successCount} riders!`);
  };

  // Edit Mapping
  const handleOpenEditModal = (rider: Rider) => {
    setEditingRider({ ...rider });
    setIsEditModalOpen(true);
  };

  const handleSaveEditMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRider) return;

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('riders')
          .update({
            rider_name: editingRider.rider_name,
            vehicle_number: editingRider.vehicle_number,
            vehicle_type: editingRider.vehicle_type,
            hub: editingRider.hub,
            status: editingRider.vehicle_number ? 'Active' : 'Unmapped'
          })
          .eq('phone', editingRider.phone);

        if (error) throw error;
        fetchSupabaseData(supabaseClient);
      } catch (err: any) {
        alert('Update error: ' + err.message);
      }
    } else {
      setRidersList((prev) =>
        prev.map((r) =>
          r.phone === editingRider.phone
            ? {
                ...editingRider,
                status: editingRider.vehicle_number ? 'Active' : 'Unmapped'
              }
            : r
        )
      );
    }

    setIsEditModalOpen(false);
    setEditingRider(null);
  };

  const handleDeactivateRider = async (phone: string) => {
    if (!confirm('Deactivate or unmap this rider?')) return;
    if (supabaseClient) {
      await supabaseClient.from('riders').update({ status: 'Inactive', vehicle_number: '' }).eq('phone', phone);
      fetchSupabaseData(supabaseClient);
    }
    setRidersList((prev) =>
      prev.map((r) => (r.phone === phone ? { ...r, status: 'Inactive', vehicle_number: '' } : r))
    );
  };

  // Nudge Rider Action
  const handleNudgeRider = (rider: Rider) => {
    alert(`📲 Automated Nudge SMS / WhatsApp dispatch sent to ${rider.rider_name} (${rider.phone}): "Please complete your daily vehicle inspection immediately!"`);
  };

  // Hubs List
  const hubsList = ['Hosa Road', 'Hongasandra', 'Hoodi', 'Kanakpura'];

  // Today's Date String
  const todayStr = new Date().toISOString().split('T')[0];

  // Today's Inspections
  const todayInspections = inspectionsList.filter((i) => {
    const insDate = (i.created_at || new Date().toISOString()).split('T')[0];
    return insDate === todayStr;
  });

  // Filtered Riders by Selected Hub
  const hubRiders = ridersList.filter((r) => selectedHub === 'ALL' || r.hub === selectedHub);

  const hubSubmittedPhones = new Set(
    todayInspections
      .map((i) => (i.phone || i.rider_phone || '').trim())
      .filter(Boolean)
  );
  const hubSubmittedVehicles = new Set(
    todayInspections
      .map((i) => (i.vehicle_number || '').toUpperCase().trim())
      .filter(Boolean)
  );

  const hubSubmittedRiders = hubRiders.filter(
    (r) => hubSubmittedPhones.has(r.phone.trim()) || hubSubmittedVehicles.has(r.vehicle_number.toUpperCase().trim())
  );

  const hubPendingRiders = hubRiders.filter(
    (r) => !hubSubmittedPhones.has(r.phone.trim()) && !hubSubmittedVehicles.has(r.vehicle_number.toUpperCase().trim())
  );

  const hubIssuesCount = todayInspections.filter((i) => {
    if (selectedHub === 'ALL') return i.status !== 'Working/Active';
    const matchedRider = ridersList.find(
      (r) => r.phone === (i.phone || i.rider_phone) || r.vehicle_number === i.vehicle_number
    );
    return matchedRider && matchedRider.hub === selectedHub && i.status !== 'Working/Active';
  }).length;

  const filteredRiders = ridersList.filter((r) => {
    const matchSearch =
      r.rider_name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      r.phone.includes(rosterSearch) ||
      (r.vehicle_number && r.vehicle_number.toLowerCase().includes(rosterSearch.toLowerCase())) ||
      (r.rider_id && r.rider_id.toLowerCase().includes(rosterSearch.toLowerCase()));

    const matchHub = selectedHub === 'ALL' || r.hub === selectedHub;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && r.status === 'Active') ||
      (statusFilter === 'Grounded' && r.status === 'Grounded') ||
      (statusFilter === 'Unmapped' && (!r.vehicle_number || r.status === 'Unmapped'));

    return matchSearch && matchHub && matchStatus;
  });

  const filteredLeads = leadsList.filter((l) => leadFilterStage === 'ALL' || l.stage === leadFilterStage);

  // =========================================================================
  // RENDER: INITIAL LOGIN SCREEN (LANDING VIEW)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-4 antialiased selection:bg-sky-500 selection:text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md p-8 space-y-6">
          
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl shadow-lg shadow-sky-500/20 flex items-center justify-center mx-auto text-white">
              <Bike className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              LSN Harish Team <span className="text-sky-400 font-light">Portal</span>
            </h1>
            <p className="text-xs text-slate-400">Fleet Operations & Daily Inspection Portal</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setLoginTab('rider')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                loginTab === 'rider' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rider Quick-Login
            </button>
            <button
              onClick={() => setLoginTab('tl')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                loginTab === 'tl' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              TL Ops Portal Login
            </button>
          </div>

          {/* Rider Quick-Login Tab */}
          {loginTab === 'rider' && (
            <form onSubmit={handleRiderLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Phone Number or Rider ID</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={loginPhoneOrId}
                    onChange={(e) => setLoginPhoneOrId(e.target.value)}
                    placeholder="e.g. 9876543210 or R-1001"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-2xl transition shadow-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
              >
                <span>Start Daily Inspection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TL Login Tab */}
          {loginTab === 'tl' && (
            <form onSubmit={handleTlLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Team Lead Username / Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={tlEmail}
                    onChange={(e) => setTlEmail(e.target.value)}
                    placeholder="tl.indiranagar@fleetguard.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={tlPassword}
                    onChange={(e) => setTlPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition shadow-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
              >
                <span>Login to TL Dashboard</span>
                <LogIn className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTlEmail('tl.admin@fleetguard.com');
                    setTlPassword('admin123');
                  }}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 underline font-mono"
                >
                  ⚡ Fill Demo TL Credentials
                </button>
              </div>
            </form>
          )}

          <div className="border-t border-slate-800 pt-4 text-center">
            <button
              onClick={() => setIsConfigOpen(true)}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center space-x-1.5 mx-auto"
            >
              <Settings className="w-3.5 h-3.5 text-sky-400" />
              <span>Configure Supabase & Ops Email</span>
            </button>
          </div>
        </div>

        {/* SUPABASE & SETTINGS MODAL */}
        {isConfigOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-sky-400" />
                  <h3 className="font-bold text-white text-base">Settings & Supabase Configuration</h3>
                </div>
                <button onClick={() => setIsConfigOpen(false)} className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Ops Support Email (For mailto:)</label>
                  <input
                    type="email"
                    value={opsEmail}
                    onChange={(e) => setOpsEmail(e.target.value)}
                    placeholder="ops-support@company.com"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Supabase Project URL</label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Supabase Anon / Public Key</label>
                  <input
                    type="text"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
              >
                Save Settings & Connect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: RIDER DEDICATED SCREEN (AFTER RIDER LOGIN)
  // =========================================================================
  if (currentUser.role === 'rider') {
    return (
      <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-sky-500 selection:text-white">
        {/* Rider Top Header */}
        <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/20">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">LSN Harish Team</h1>
                <p className="text-[11px] text-sky-400 font-mono">Rider Daily Inspection Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white">Welcome, {currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">Plate: {currentUser.vehicle_number || 'KA-01-EQ-9999'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Rider Inspection Form Container */}
        <main className="max-w-xl mx-auto px-4 py-6 flex-1 w-full space-y-4">
          {isSubmitted && lastSubmission ? (
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 text-center shadow-2xl space-y-5">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Daily Inspection Submitted!</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Vehicle data logged for {lastSubmission.rider_name} ({lastSubmission.vehicle_number}).
                </p>
              </div>
              <div className="p-4 bg-slate-950/80 rounded-2xl text-left border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="font-bold text-emerald-400">{lastSubmission.status}</span>
                </div>
                {lastSubmission.status !== 'Working/Active' && (
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">REASON:</span>
                    <span className="text-amber-300 font-bold">{lastSubmission.return_reason}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">PHOTOS VERIFIED:</span>
                  <span className="text-emerald-400 font-bold">5 of 5 Live Snaps ✓</span>
                </div>
              </div>
              <button
                onClick={handleResetForm}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-2xl transition shadow-xl text-xs uppercase tracking-wider"
              >
                Start New Inspection
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm">Daily Vehicle Inspection</h2>
                    <p className="text-[11px] text-slate-400">Camera-only live verification</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-3 py-1 rounded-full border border-slate-700">
                  5 Photos Required
                </span>
              </div>

              <form onSubmit={handleSubmitReport} className="p-5 space-y-6">
                
                {/* Auto-populated Rider Info Card */}
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{currentUser.name}</div>
                      <div className="text-xs text-emerald-400 font-mono font-semibold">
                        Vehicle: {currentUser.vehicle_number || 'KA-01-EQ-9999'} • {currentUser.hub || 'Indiranagar Hub'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Verified ✓
                  </span>
                </div>

                {/* STEP 2: STATUS & REASON */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    1. Vehicle Operational Status
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'Working/Active', label: 'Active / Working', icon: Activity },
                      { id: 'Breakdown', label: 'Breakdown / Issue', icon: AlertTriangle },
                      { id: 'Servicing', label: 'In Servicing', icon: Wrench },
                      { id: 'Returned/Idle', label: 'Returned / Idle', icon: RotateCcw }
                    ].map((st) => {
                      const isSelected = selectedStatus === st.id;
                      const Icon = st.icon;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSelectedStatus(st.id)}
                          className={`p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition ${
                            isSelected
                              ? 'bg-sky-600/25 border-sky-500 text-white shadow-lg'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Icon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                          <div className="text-xs font-bold">{st.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedStatus !== 'Working/Active' && (
                    <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3">
                      <label className="block text-xs font-bold text-amber-300">
                        Specify Reason for Non-Active Status:
                      </label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-amber-500/40 rounded-xl text-white text-xs focus:outline-none"
                      >
                        <option value="">-- Choose Mandatory Reason --</option>
                        <option value="Engine Failure / Motor Issue">Engine Failure / Motor Issue</option>
                        <option value="Flat Tyre / Wheel Puncture">Flat Tyre / Wheel Puncture</option>
                        <option value="Brake Cable / Pad Failure">Brake Cable / Pad Failure</option>
                        <option value="Battery Drain / Charging Failure">Battery Drain / Charging Failure</option>
                        <option value="Accidental Damage">Accidental Damage</option>
                        <option value="Shift Ended - Parked at Hub">Shift Ended - Parked at Hub</option>
                        <option value="Rider Off-Duty / Leave">Rider Off-Duty / Leave</option>
                        <option value="Periodic Scheduled Servicing">Periodic Scheduled Servicing</option>
                        <option value="Other Reason">Other Reason...</option>
                      </select>

                      {returnReason === 'Other Reason' && (
                        <textarea
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="Please describe exact reason..."
                          className="w-full p-3 bg-slate-950 border border-amber-500/40 rounded-xl text-white text-xs focus:outline-none"
                          rows={2}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* STEP 3: CAMERA CAPTURE */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        2. Live Camera Photo Verification
                      </label>
                      <p className="text-[11px] text-amber-400 font-mono flex items-center space-x-1 mt-0.5">
                        <span>🚫 Storage upload blocked. Camera feed only.</span>
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                      {photoCount} / 5 Snaps
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {PHOTO_STEPS.map((step, idx) => {
                      const isCaptured = !!capturedPhotos[step.id];
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => {
                            stopCamera();
                            setCurrentStepIndex(idx);
                          }}
                          className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all overflow-hidden ${
                            isCaptured
                              ? 'border-emerald-500 bg-emerald-950/40'
                              : isCurrent
                              ? 'border-sky-500 bg-sky-950/50 ring-2 ring-sky-500/40'
                              : 'border-slate-800 bg-slate-950 opacity-50'
                          }`}
                        >
                          {isCaptured ? (
                            <>
                              <img src={capturedPhotos[step.id]} className="w-full h-full object-cover rounded-lg" alt={step.label} />
                              <span className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                                <Check className="w-4 h-4 text-emerald-400" />
                              </span>
                            </>
                          ) : (
                            <>
                              <Camera className={`w-4 h-4 ${isCurrent ? 'text-sky-400' : 'text-slate-500'}`} />
                              <span className="text-[9px] font-semibold mt-1 text-slate-300 truncate w-full">
                                {idx + 1}. {step.id}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        Current Angle: <span className="text-sky-400">{PHOTO_STEPS[currentStepIndex].label}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{PHOTO_STEPS[currentStepIndex].desc}</span>
                    </div>

                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${
                          !isCameraActive ? 'hidden' : currentFacingMode === 'user' ? 'scale-x-[-1]' : ''
                        }`}
                      />

                      {capturedPhotos[PHOTO_STEPS[currentStepIndex].id] && !isCameraActive && (
                        <img src={capturedPhotos[PHOTO_STEPS[currentStepIndex].id]} alt="Preview" className="w-full h-full object-cover" />
                      )}

                      {!isCameraActive && !capturedPhotos[PHOTO_STEPS[currentStepIndex].id] && (
                        <div className="text-center space-y-2 p-6">
                          <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-400">Tap below to activate device live camera stream</p>
                        </div>
                      )}

                      {isCameraActive && (
                        <div className="absolute inset-0 border-2 border-dashed border-sky-400/50 pointer-events-none rounded-2xl m-3 flex items-center justify-center">
                          <span className="text-white text-[10px] font-mono bg-slate-950/80 px-3 py-1 rounded-full backdrop-blur">
                            ALIGN: {PHOTO_STEPS[currentStepIndex].label}
                          </span>
                        </div>
                      )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-2">
                      {!isCameraActive ? (
                        <button
                          type="button"
                          onClick={() => startCamera(PHOTO_STEPS[currentStepIndex].facing)}
                          className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-sky-600/20"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{capturedPhotos[PHOTO_STEPS[currentStepIndex].id] ? 'Retake Live Photo' : 'Activate Camera'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/30 transition animate-pulse"
                        >
                          <Camera className="w-4 h-4" />
                          <span>SNAP PHOTO NOW</span>
                        </button>
                      )}

                      {isCameraActive && (
                        <button
                          type="button"
                          onClick={() => startCamera(currentFacingMode === 'user' ? 'environment' : 'user')}
                          className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center justify-center"
                          title="Flip Camera"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-2xl ${
                    canSubmit
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <span>Submit Daily Inspection Report</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Is Super Admin check
  const isSuperAdmin = currentUser?.username?.toLowerCase() === 'harish.kundurpi@loadshare.net' || currentUser?.role === 'admin';

  // =========================================================================
  // RENDER: TEAM LEAD (TL) & ADMIN DEDICATED DASHBOARD (SINGLE-SIDE SIDEBAR)
  // =========================================================================
  return (
    <div className="bg-slate-950 text-slate-100 h-screen flex flex-row overflow-hidden antialiased selection:bg-sky-500 selection:text-white">
      
      {/* SINGLE UNIFIED LEFT SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="p-5 space-y-6 overflow-y-auto no-scrollbar flex-1">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white truncate">LSN Harish Team</h1>
              <p className="text-[10px] text-emerald-400 font-mono truncate">{currentUser.name} ({currentUser.hub || 'All Hubs'})</p>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-3 mb-2">Operations Portal</div>

            {[
              { id: 'submitted', label: 'Submitted Photo Gallery', icon: Camera, count: hubSubmittedRiders.length },
              { id: 'pending', label: 'Pending Riders', icon: Clock, count: hubPendingRiders.length },
              { id: 'roster', label: 'Roster & Onboard', icon: Users, count: hubRiders.length },
              { id: 'tickets', label: 'Issue Ticket Center', icon: LifeBuoy, count: ticketsList.length },
              { id: 'sourcing', label: 'Rider Sourcing', icon: UserCheck, count: leadsList.length }
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = tlSubTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTlSubTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* ADMIN ONLY MENU ITEM */}
            {isSuperAdmin && (
              <div className="pt-4 space-y-1.5 border-t border-slate-800 mt-4">
                <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider px-3 mb-2">Super Admin Control</div>
                
                <button
                  onClick={() => setTlSubTab('tl_management')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition border ${
                    tlSubTab === 'tl_management'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg'
                      : 'text-indigo-300 hover:text-white hover:bg-indigo-950/40 border-indigo-500/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Admin Account Manager</span>
                </button>

                <button
                  onClick={() => setIsConfigOpen(true)}
                  className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold text-sky-300 hover:text-white hover:bg-sky-950/40 transition border border-sky-500/20"
                >
                  <Settings className="w-4 h-4 text-sky-400" />
                  <span>System Settings & API</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Portal</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950">
        
        {/* Top Header Bar */}
        <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-30 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              {tlSubTab === 'submitted' && 'Submitted Photo Gallery'}
              {tlSubTab === 'pending' && 'Pending Riders Inspection'}
              {tlSubTab === 'roster' && 'Fleet Roster & Bulk CSV Onboarding'}
              {tlSubTab === 'tickets' && 'Action Center & Issue Tickets'}
              {tlSubTab === 'sourcing' && 'Rider Sourcing Pipeline'}
              {tlSubTab === 'tl_management' && 'Admin Account Manager'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-semibold">Hub Filter:</span>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Hubs (Entire Fleet)</option>
              {hubsList.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Dashboard Main Content Container */}
        <main className="p-6 space-y-6 flex-1 w-full max-w-7xl mx-auto">
          
          {/* STATS SUMMARY BAR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Assigned Riders</div>
              <div className="text-2xl font-black text-white mt-1">{hubRiders.length}</div>
              <div className="text-[10px] text-sky-400 mt-1 font-mono">Mapped to {selectedHub === 'ALL' ? 'All Hubs' : selectedHub}</div>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl shadow-lg">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Submitted Today</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{hubSubmittedRiders.length}</div>
              <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">Completed Inspection ✓</div>
            </div>

            <div className="bg-slate-900/90 border border-rose-500/30 p-4 rounded-2xl shadow-lg">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Pending Today</div>
              <div className="text-2xl font-black text-rose-400 mt-1">{hubPendingRiders.length}</div>
              <div className="text-[10px] text-rose-400/80 mt-1 font-mono">Yet to Submit</div>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl shadow-lg">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Issue / Breakdown</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{hubIssuesCount}</div>
              <div className="text-[10px] text-amber-400/80 mt-1 font-mono">Flagged Vehicles</div>
            </div>
          </div>

          {/* ACTIVE SUB-TAB CONTENT VIEW */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">

          {/* ================= TAB A: SUBMITTED RIDERS & PHOTO GALLERY ================= */}
          {tlSubTab === 'submitted' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Today's Verified Submissions for {selectedHub === 'ALL' ? 'All Hubs' : selectedHub}</span>
              </h3>

              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1 no-scrollbar">
                {todayInspections
                  .filter((ins) => {
                    if (selectedHub === 'ALL') return true;
                    const matchRider = ridersList.find(
                      (r) => r.phone === (ins.phone || ins.rider_phone) || r.vehicle_number === ins.vehicle_number
                    );
                    return matchRider && matchRider.hub === selectedHub;
                  })
                  .map((ins, index) => {
                    const status = ins.status || 'Working/Active';
                    const isActive = status === 'Working/Active';
                    const isBreakdown = status === 'Breakdown';

                    const badgeBg = isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isBreakdown
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                    const photos: { [key: string]: string | undefined } = ins.photos || {
                      selfie: ins.selfie_url,
                      front: ins.front_url,
                      back: ins.back_url,
                      left: ins.left_url,
                      right: ins.right_url
                    };

                    return (
                      <div
                        key={ins.id || index}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-slate-700 transition"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-sky-400 text-xs">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{ins.rider_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
                                <span>📞 {ins.phone || ins.rider_phone || 'N/A'}</span>
                                <span>•</span>
                                <span className="text-sky-400 font-bold">{ins.vehicle_number}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${badgeBg}`}>
                              {status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(ins.created_at || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        {!isActive && (
                          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <div>
                              <span className="font-bold">Flagged Reason:</span> {ins.return_reason || 'No reason specified'}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                            5-Angle Live Photo Verification (Click to Enlarge):
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {['selfie', 'front', 'back', 'left', 'right'].map((angle) => {
                              const url = photos[angle];
                              return (
                                <div
                                  key={angle}
                                  onClick={() => url && setEnlargedPhotoUrl(url)}
                                  className="aspect-square bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative group cursor-pointer shadow"
                                >
                                  {url ? (
                                    <>
                                      <img src={url} alt={angle} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <Maximize2 className="w-4 h-4 text-white" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-600">
                                      N/A
                                    </div>
                                  )}
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] text-slate-300 text-center py-0.5 uppercase font-mono">
                                    {angle}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {todayInspections.length === 0 && (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No inspection submissions recorded for today yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB B: PENDING RIDERS ================= */}
          {tlSubTab === 'pending' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Pending Inspection Riders for {selectedHub === 'ALL' ? 'All Hubs' : selectedHub} ({hubPendingRiders.length})</span>
              </h3>

              <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-mono">
                    <tr>
                      <th className="p-3">Rider Name</th>
                      <th className="p-3">Phone Number</th>
                      <th className="p-3">Vehicle Plate</th>
                      <th className="p-3">Assigned Hub</th>
                      <th className="p-3 text-right">Action / Nudge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {hubPendingRiders.map((r, idx) => (
                      <tr key={r.phone || idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-white">
                          {r.rider_name}{' '}
                          <span className="text-[10px] text-slate-400 font-mono">({r.rider_id || 'R-NO-ID'})</span>
                        </td>
                        <td className="p-3 font-mono text-slate-300">{r.phone}</td>
                        <td className="p-3 font-mono text-sky-400 font-bold">{r.vehicle_number || 'Unassigned'}</td>
                        <td className="p-3 text-slate-400">{r.hub || 'N/A'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleNudgeRider(r)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-[11px] transition shadow-lg shadow-rose-600/20 flex items-center space-x-1.5 ml-auto"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call / Nudge</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {hubPendingRiders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-emerald-400 font-semibold text-xs">
                          🎉 All riders in this hub have completed their daily inspection today!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB C: ROSTER & ONBOARD ================= */}
          {tlSubTab === 'roster' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 h-fit">
                <h4 className="font-bold text-white text-xs flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Single Rider Onboard & Map</span>
                </h4>

                <form onSubmit={handleOnboardRider} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Rider Full Name *</label>
                    <input
                      type="text"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Phone (10 Digits) *</label>
                      <input
                        type="tel"
                        value={onboardPhone}
                        onChange={(e) => setOnboardPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Rider ID</label>
                      <input
                        type="text"
                        value={onboardRiderId}
                        onChange={(e) => setOnboardRiderId(e.target.value)}
                        placeholder="R-1043"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Vehicle Plate *</label>
                      <input
                        type="text"
                        value={onboardVehicle}
                        onChange={(e) => setOnboardVehicle(e.target.value)}
                        placeholder="KA 05 MX 2231"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Type</label>
                      <select
                        value={onboardVehicleType}
                        onChange={(e) => setOnboardVehicleType(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                      >
                        <option value="Motorbike">Motorbike</option>
                        <option value="EV Scooter">EV Scooter</option>
                        <option value="Cargo Van">Cargo Van</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Hub</label>
                    <select
                      value={onboardHub}
                      onChange={(e) => setOnboardHub(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                    >
                      <option value="Indiranagar Hub">Indiranagar Hub</option>
                      <option value="Koramangala Hub">Koramangala Hub</option>
                      <option value="HSR Layout Hub">HSR Layout Hub</option>
                      <option value="Whitefield Hub">Whitefield Hub</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow text-xs"
                  >
                    Deploy Rider & Map
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-semibold text-xs">Bulk CSV Import (500+)</label>
                  <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center bg-slate-900 relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-300">Upload CSV (Name, Phone, Plate, Hub)</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs">Assigned Roster Table</h4>
                  <div className="relative w-48">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      placeholder="Search roster..."
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950 max-h-[500px]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-mono">
                      <tr>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Plate</th>
                        <th className="p-2.5">Hub</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRiders.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-white">{r.rider_name}</td>
                          <td className="p-2.5 font-mono">{r.phone}</td>
                          <td className="p-2.5 font-mono text-sky-400">{r.vehicle_number || 'Unassigned'}</td>
                          <td className="p-2.5 text-slate-400">{r.hub}</td>
                          <td className="p-2.5 text-right space-x-1">
                            <button onClick={() => handleOpenEditModal(r)} className="px-2 py-1 bg-slate-800 text-sky-400 rounded text-[10px]">Edit</button>
                            <button onClick={() => handleDeactivateRider(r.phone)} className="px-2 py-1 bg-rose-950 text-rose-400 rounded text-[10px]">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB D: ACTION CENTER & TICKETS ================= */}
          {tlSubTab === 'tickets' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 h-fit">
                <h4 className="font-bold text-white text-xs flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <LifeBuoy className="w-4 h-4 text-amber-400" />
                  <span>Submit Operational Issue Ticket</span>
                </h4>

                {lastTicketNum && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                    ✓ Ticket <strong className="font-mono">{lastTicketNum}</strong> created in backend & draft opened in email client!
                  </div>
                )}

                <form onSubmit={handleIssueTicketSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Issue Category *</label>
                    <select
                      value={ticketType}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                    >
                      <option value="ID Transfer Issue">ID Transfer Issue</option>
                      <option value="Wallet / Balance Issue">Wallet / Balance Issue</option>
                      <option value="Payment / Payout Issue">Payment / Payout Issue</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Rider Name *</label>
                      <input
                        type="text"
                        value={ticketRiderName}
                        onChange={(e) => setTicketRiderName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={ticketPhone}
                        onChange={(e) => setTicketPhone(e.target.value)}
                        placeholder="10-digit phone"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Vehicle Plate</label>
                      <input
                        type="text"
                        value={ticketVehicle}
                        onChange={(e) => setTicketVehicle(e.target.value)}
                        placeholder="KA 05 MX 2231"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white uppercase font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Priority Level</label>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                      >
                        <option value="Normal">Normal Priority</option>
                        <option value="Urgent">Urgent Priority</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Issue Description *</label>
                    <textarea
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      placeholder="Describe the issue in detail..."
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Attachment (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setTicketAttachment(e.target.files?.[0] || null)}
                      className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-slate-800 file:text-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow-lg shadow-amber-600/20 text-xs flex items-center justify-center space-x-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Ticket & Open Email Draft</span>
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <h4 className="font-bold text-white text-xs">Submitted Tickets History & Status</h4>
                <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950 max-h-[600px]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Ticket #</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Rider</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {ticketsList.map((t, idx) => (
                        <tr key={t.id || idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-amber-400">{t.ticket_number}</td>
                          <td className="p-3 font-semibold text-white">{t.issue_type}</td>
                          <td className="p-3">
                            <div>{t.rider_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{t.phone}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${t.priority === 'Urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-300'}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 max-w-xs truncate">{t.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB E: RIDER SOURCING PIPELINE ================= */}
          {tlSubTab === 'sourcing' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 h-fit">
                <h4 className="font-bold text-white text-xs flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>Onboard New Rider Lead</span>
                </h4>

                <form onSubmit={handleLeadSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Lead Full Name *</label>
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. Karan Singh"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Contact Number *</label>
                    <input
                      type="tel"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="10-digit phone"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Preferred Hub</label>
                    <select
                      value={leadHub}
                      onChange={(e) => setLeadHub(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                    >
                      <option value="Indiranagar Hub">Indiranagar Hub</option>
                      <option value="Koramangala Hub">Koramangala Hub</option>
                      <option value="HSR Layout Hub">HSR Layout Hub</option>
                      <option value="Whitefield Hub">Whitefield Hub</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Source</label>
                      <select
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                      >
                        <option value="Referral">Referral</option>
                        <option value="Walk-in">Walk-in</option>
                        <option value="Online Ad">Online Ad</option>
                        <option value="Campus Drive">Campus Drive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Stage</label>
                      <select
                        value={leadStage}
                        onChange={(e) => setLeadStage(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Interviewed">Interviewed</option>
                        <option value="Document Verified">Document Verified</option>
                        <option value="Ready for Mapping">Ready for Mapping</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 text-xs flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Lead to Pipeline</span>
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs">Sourcing Pipeline Board ({filteredLeads.length})</h4>
                  <select
                    value={leadFilterStage}
                    onChange={(e) => setLeadFilterStage(e.target.value)}
                    className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                  >
                    <option value="ALL">All Stages</option>
                    <option value="Lead">Lead</option>
                    <option value="Interviewed">Interviewed</option>
                    <option value="Document Verified">Document Verified</option>
                    <option value="Ready for Mapping">Ready for Mapping</option>
                  </select>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950 max-h-[600px]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Lead Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Hub</th>
                        <th className="p-3">Source</th>
                        <th className="p-3">Stage</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredLeads.map((l, idx) => (
                        <tr key={l.id || idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">{l.lead_name}</td>
                          <td className="p-3 font-mono">{l.phone}</td>
                          <td className="p-3 text-slate-400">{l.preferred_hub}</td>
                          <td className="p-3 text-slate-400">{l.source}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {l.stage}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleConvertLeadToRider(l)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] transition shadow"
                            >
                              Map to Fleet
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                            No leads found in this stage.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB F: ADMIN ACCOUNT MANAGER ================= */}
          {tlSubTab === 'tl_management' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Manage Team Lead Credentials</h3>
                </div>

                <form onSubmit={handleAddTlAccount} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Full Name *</label>
                      <input
                        type="text"
                        value={newTlName}
                        onChange={(e) => setNewTlName(e.target.value)}
                        placeholder="TL Ramesh"
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Username / Email *</label>
                      <input
                        type="email"
                        value={newTlUsername}
                        onChange={(e) => setNewTlUsername(e.target.value)}
                        placeholder="ramesh@loadshare.net"
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Temporary Password *</label>
                      <input
                        type="password"
                        value={newTlPassword}
                        onChange={(e) => setNewTlPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Assigned Hub</label>
                      <select
                        value={newTlHub}
                        onChange={(e) => setNewTlHub(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                      >
                        <option value="Hosa Road">Hosa Road</option>
                        <option value="Hongasandra">Hongasandra</option>
                        <option value="Hoodi">Hoodi</option>
                        <option value="Kanakpura">Kanakpura</option>
                        <option value="All Hubs">All Hubs (Admin)</option>
                        <option value="Indiranagar Hub">Indiranagar Hub</option>
                        <option value="Koramangala Hub">Koramangala Hub</option>
                        <option value="Whitefield Hub">Whitefield Hub</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Role</label>
                      <select
                        value={newTlRole}
                        onChange={(e) => setNewTlRole(e.target.value as any)}
                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white"
                      >
                        <option value="tl">Team Lead (TL)</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20"
                      >
                        Create / Update TL Account
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Live TL Accounts Roster Table ({appUsersList.length})</span>
                </h4>

                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-mono">
                      <tr>
                        <th className="p-3">Full Name</th>
                        <th className="p-3">Username / Email</th>
                        <th className="p-3">Assigned Hub</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Date Created</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-sans">
                      {appUsersList.map((u, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">{u.name}</td>
                          <td className="p-3 font-mono text-sky-400">{u.username}</td>
                          <td className="p-3 text-slate-300">{u.hub || 'All Hubs'}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setNewTlName(u.name);
                                setNewTlUsername(u.username);
                                setNewTlPassword(u.password || '');
                                setNewTlHub(u.hub || 'Hosa Road');
                                setNewTlRole(u.role || 'tl');
                              }}
                              className="px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-300 rounded-lg text-[11px] font-semibold transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTlAccount(u.username)}
                              className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg text-[11px] font-semibold transition"
                            >
                              Revoke Access / Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      </div>

      {/* MODAL 1: PHOTO ENLARGE PREVIEW MODAL */}
      {enlargedPhotoUrl && (
        <div
          onClick={() => setEnlargedPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setEnlargedPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={enlargedPhotoUrl}
              alt="Enlarged inspection snapshot"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT MAPPING MODAL */}
      {isEditModalOpen && editingRider && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Edit Rider Mapping</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMapping} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rider Full Name</label>
                <input
                  type="text"
                  value={editingRider.rider_name}
                  onChange={(e) => setEditingRider({ ...editingRider, rider_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mobile Phone (Read-Only ID)</label>
                <input
                  type="text"
                  value={editingRider.phone}
                  disabled
                  className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Vehicle Plate Number</label>
                <input
                  type="text"
                  value={editingRider.vehicle_number}
                  onChange={(e) => setEditingRider({ ...editingRider, vehicle_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. KA 05 MX 2231"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Vehicle Type</label>
                <select
                  value={editingRider.vehicle_type || 'Motorbike'}
                  onChange={(e) => setEditingRider({ ...editingRider, vehicle_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="Motorbike">Motorbike</option>
                  <option value="EV Scooter">EV Scooter</option>
                  <option value="Cargo Van">Cargo Van</option>
                  <option value="Bicycle">Bicycle</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Hub</label>
                <select
                  value={editingRider.hub || 'Indiranagar Hub'}
                  onChange={(e) => setEditingRider({ ...editingRider, hub: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="Indiranagar Hub">Indiranagar Hub</option>
                  <option value="Koramangala Hub">Koramangala Hub</option>
                  <option value="HSR Layout Hub">HSR Layout Hub</option>
                  <option value="Whitefield Hub">Whitefield Hub</option>
                  <option value="Electronic City Hub">Electronic City Hub</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-sky-600/20">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE TL ACCOUNTS (ADMIN ONLY) */}
      {isManageTlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Manage Team Lead & Admin Accounts</h3>
              </div>
              <button onClick={() => setIsManageTlModalOpen(false)} className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTlAccount} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-xs">Create New TL / Admin Login</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    value={newTlName}
                    onChange={(e) => setNewTlName(e.target.value)}
                    placeholder="Amit TL"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Username / Email *</label>
                  <input
                    type="email"
                    value={newTlUsername}
                    onChange={(e) => setNewTlUsername(e.target.value)}
                    placeholder="tl.hub@fleetguard.com"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Password *</label>
                  <input
                    type="password"
                    value={newTlPassword}
                    onChange={(e) => setNewTlPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Assigned Hub</label>
                  <select
                    value={newTlHub}
                    onChange={(e) => setNewTlHub(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="All Hubs">All Hubs (Admin)</option>
                    <option value="Indiranagar Hub">Indiranagar Hub</option>
                    <option value="Koramangala Hub">Koramangala Hub</option>
                    <option value="HSR Layout Hub">HSR Layout Hub</option>
                    <option value="Whitefield Hub">Whitefield Hub</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-3 text-xs text-slate-300">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tlRole"
                      checked={newTlRole === 'tl'}
                      onChange={() => setNewTlRole('tl')}
                    />
                    <span>Team Lead (TL)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tlRole"
                      checked={newTlRole === 'admin'}
                      onChange={() => setNewTlRole('admin')}
                    />
                    <span>System Admin</span>
                  </label>
                </div>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition">
                  Create Account
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-xs">Existing TL & Admin Accounts</h4>
              <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-mono">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Username / Email</th>
                      <th className="p-2.5">Hub</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {appUsersList.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-white">{u.name}</td>
                        <td className="p-2.5 font-mono text-sky-400">{u.username}</td>
                        <td className="p-2.5 text-slate-400">{u.hub}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleDeleteTlAccount(u.username)}
                            className="px-2.5 py-1 bg-rose-950 text-rose-400 rounded text-[10px]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPABASE API CONFIG MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Settings & Supabase Configuration</h3>
              </div>
              <button onClick={() => setIsConfigOpen(false)} className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Ops Support Email (For mailto:)</label>
                <input
                  type="email"
                  value={opsEmail}
                  onChange={(e) => setOpsEmail(e.target.value)}
                  placeholder="ops-support@company.com"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Supabase Project URL</label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Supabase Anon / Public Key</label>
                <input
                  type="text"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
            >
              Save Settings & Connect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
