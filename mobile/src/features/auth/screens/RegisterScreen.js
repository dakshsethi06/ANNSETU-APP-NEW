import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Image, Modal, FlatList, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../core/network/supabase';
import styles from '../styles/authStyles';
import localStyles from '../styles/registerStyles';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import { COLORS, SPACING, RADIUS } from '../../../core/theme/theme';

const ROLES = [
    { key: 'farmer', label: 'Farmer', sub: 'Store & manage my crops', emoji: '🌾' },
    { key: 'vendor', label: 'Vendor / Trader', sub: 'Buy commodities from cold storages', emoji: '🏪' },
    { key: 'coldstorage', label: 'Cold Storage', sub: 'Manage my cold storage facility', emoji: '❄️' },
];

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const DISTRICTS_BY_STATE = {
    'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
    'Arunachal Pradesh': ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Lohit', 'Lower Dibang Valley', 'Lower Subansiri', 'Papum Pare', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
    'Assam': ['Baksa', 'Barpeta', 'Bongaigaon', 'Cachar', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat', 'Hailakandi', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia', 'Udalguri'],
    'Bihar': ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
    'Chhattisgarh': ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur', 'Surguja'],
    'Goa': ['North Goa', 'South Goa'],
    'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhumi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
    'Haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
    'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
    'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Saraikela Kharsawan', 'Simdega', 'West Singhbhum'],
    'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shimoga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
    'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
    'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
    'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
    'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Senapati', 'Tamenglong', 'Thoubal', 'Ukhrul'],
    'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
    'Mizoram': ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
    'Nagaland': ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
    'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
    'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Tarn Taran'],
    'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
    'Sikkim': ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
    'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
    'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal–Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
    'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
    'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad (Prayagraj)', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Rae Bareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shrawasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
    'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
    'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
};

// ── Dropdown Picker Component (matching prototype select styling) ──
function DropdownPicker({ label, placeholder, value, options, onSelect, lang = 'en' }) {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const filteredOptions = search
        ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
        : options;

    const openPicker = () => { setSearch(''); setVisible(true); };

    const searchPlaceholder = lang === 'en' ? 'Search...' : 'खोजें...';
    const noResultsText = lang === 'en' ? 'No results found' : 'कोई परिणाम नहीं मिला';
    const noOptionsText = lang === 'en' ? 'No options available' : 'कोई विकल्प उपलब्ध नहीं है';

    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>{label}</Text>
            {/* Trigger — matches prototype: border border-border rounded-xl px-4 py-3.5 bg-card */}
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: 'rgba(30, 92, 46, 0.12)',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    height: 52,
                }}
                onPress={openPicker}
                activeOpacity={0.7}
            >
                <Text style={{
                    fontSize: 14,
                    color: value ? '#1A2E1A' : '#6B7B6B',
                    flex: 1,
                }}>
                    {value || placeholder}
                </Text>
                <Feather name="chevron-down" size={15} color="#6B7B6B" />
            </TouchableOpacity>

            {/* Bottom sheet modal */}
            <Modal visible={visible} transparent animationType="slide">
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <View
                        style={{
                            backgroundColor: '#ffffff',
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            maxHeight: '65%',
                            paddingBottom: Platform.OS === 'ios' ? 34 : 16,
                        }}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Green accent bar */}
                        <View style={{
                            backgroundColor: '#1E5C2E',
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            paddingHorizontal: 20,
                            paddingTop: 18,
                            paddingBottom: 14,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>
                                {label.replace(' *', '')}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setVisible(false)}
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Feather name="x" size={16} color="#ffffff" />
                            </TouchableOpacity>
                        </View>

                        {/* Search bar (for lists with many items) */}
                        {options.length > 10 && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginHorizontal: 16,
                                marginTop: 12,
                                marginBottom: 4,
                                backgroundColor: '#F5F3EE',
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                height: 40,
                            }}>
                                <Feather name="search" size={14} color="#6B7B6B" />
                                <TextInput
                                    style={{
                                        flex: 1,
                                        fontSize: 14,
                                        color: '#1A2E1A',
                                        marginLeft: 8,
                                        paddingVertical: 0,
                                    }}
                                    placeholder={searchPlaceholder}
                                    placeholderTextColor="#6B7B6B"
                                    value={search}
                                    onChangeText={setSearch}
                                    autoCorrect={false}
                                />
                                {search.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearch('')}>
                                        <Feather name="x-circle" size={14} color="#6B7B6B" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Options list */}
                        <FlatList
                            data={filteredOptions}
                            keyExtractor={(item) => item}
                            style={{ marginTop: 4 }}
                            renderItem={({ item }) => {
                                const isSelected = item === value;
                                return (
                                    <TouchableOpacity
                                        style={{
                                            paddingHorizontal: 20,
                                            paddingVertical: 14,
                                            backgroundColor: isSelected ? 'rgba(30, 92, 46, 0.06)' : 'transparent',
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderColor: 'rgba(30, 92, 46, 0.08)',
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                        onPress={() => { onSelect(item); setVisible(false); }}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={{
                                            fontSize: 14,
                                            color: isSelected ? '#1E5C2E' : '#1A2E1A',
                                            fontWeight: isSelected ? '600' : '400',
                                        }}>{item}</Text>
                                        {isSelected && (
                                            <View style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                backgroundColor: '#1E5C2E',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}>
                                                <Feather name="check" size={12} color="#ffffff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, color: '#6B7B6B' }}>
                                        {search ? noResultsText : noOptionsText}
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const TRANSLATIONS = {
    en: {
        createAccount: "Create Account",
        subtitleHeader: "Join thousands of farmers, vendors & cold storages",
        roles: {
            farmer: { label: "Farmer", sub: "Store & manage my crops" },
            vendor: { label: "Vendor / Trader", sub: "Buy commodities from cold storages" },
            coldstorage: { label: "Cold Storage", sub: "Manage my cold storage facility" }
        },
        iam: "I am a...",
        iamSub: "Select your role to get the right experience",
        continue: "Continue",
        verifyOtp: "Verify with OTP & Continue",
        personalInfo: "Personal Information",
        personalSub: "Your basic details for account setup",
        coldStorageName: "Cold Storage Name",
        coldStoragePlaceholder: "e.g. SN Sharma Cold Storage",
        businessName: "Business / Firm Name",
        businessPlaceholder: "e.g. SN Sharma Trading Co.",
        fullName: "Full Name",
        fullNamePlaceholder: "Enter your full name",
        mobileNumber: "Mobile Number *",
        mobilePlaceholder: "10-digit mobile number",
        emailAddress: "Email Address *",
        emailPlaceholder: "example@email.com",
        setMpin: "Set 4-Digit MPIN *",
        mpinPlaceholder: "Enter 4-digit MPIN",
        addressDetails: "Address Details",
        addressSub: "Your location helps connect nearby cold storages",
        state: "State *",
        statePlaceholder: "Select State",
        district: "District *",
        districtPlaceholder: "Select District",
        village: "Village / Town",
        villagePlaceholder: "e.g. Tundla",
        pincode: "Pincode",
        pincodePlaceholder: "e.g. 283204",
        kycVerification: "KYC Verification",
        kycSub: "Required for secure transactions & compliance",
        kycAlert: "Your KYC documents are encrypted and stored securely. They are only used for identity verification.",
        aadhaarNumber: "Aadhaar Number *",
        panNumber: "PAN Number (Optional)",
        panPlaceholder: "ABCDE1234F",
        accountSaved: "Account Details Saved!",
        welcomeAnnsetu: "Welcome to Annsetu,",
        accountSummary: "Account Summary",
        nameLabel: "Name",
        mobileLabel: "Mobile",
        roleLabel: "Role",
        steps: ['Role', 'Personal Info', 'Address', 'KYC', 'Done']
    },
    hi: {
        createAccount: "खाता बनाएं",
        subtitleHeader: "हजारों किसानों, विक्रेताओं और कोल्ड स्टोरेज से जुड़ें",
        roles: {
            farmer: { label: "किसान", sub: "अपनी फसलों का भंडारण और प्रबंधन करें" },
            vendor: { label: "विक्रेता / व्यापारी", sub: "कोल्ड स्टोरेज से वस्तुएं खरीदें" },
            coldstorage: { label: "कोल्ड स्टोरेज", sub: "अपने कोल्ड स्टोरेज सुविधा का प्रबंधन करें" }
        },
        iam: "मैं हूँ एक...",
        iamSub: "सही अनुभव प्राप्त करने के लिए अपनी भूमिका चुनें",
        continue: "जारी रखें",
        verifyOtp: "OTP से सत्यापित करें और जारी रखें",
        personalInfo: "व्यक्तिगत जानकारी",
        personalSub: "खाता सेटअप के लिए आपका बुनियादी विवरण",
        coldStorageName: "कोल्ड स्टोरेज का नाम",
        coldStoragePlaceholder: "जैसे: एस.एन. शर्मा कोल्ड स्टोरेज",
        businessName: "व्यवसाय / फर्म का नाम",
        businessPlaceholder: "जैसे: एस.एन. शर्मा ट्रेडिंग कंपनी",
        fullName: "पूरा नाम",
        fullNamePlaceholder: "अपना पूरा नाम दर्ज करें",
        mobileNumber: "मोबाइल नंबर *",
        mobilePlaceholder: "10 अंकों का मोबाइल नंबर",
        emailAddress: "ईमेल पता *",
        emailPlaceholder: "example@email.com",
        setMpin: "4-अंकों का MPIN सेट करें *",
        mpinPlaceholder: "4-अंकों का MPIN दर्ज करें",
        addressDetails: "पता विवरण",
        addressSub: "आपका स्थान पास के कोल्ड स्टोरेज को जोड़ने में मदद करता है",
        state: "राज्य *",
        statePlaceholder: "राज्य चुनें",
        district: "जिला *",
        districtPlaceholder: "जिला चुनें",
        village: "गांव / शहर",
        villagePlaceholder: "जैसे: टूंडला",
        pincode: "पिनकोड",
        pincodePlaceholder: "जैसे: 283204",
        kycVerification: "केवाईसी सत्यापन",
        kycSub: "सुरक्षित लेनदेन और अनुपालन के लिए आवश्यक",
        kycAlert: "आपके केवाईसी दस्तावेज एन्क्रिप्टेड और सुरक्षित रूप से संग्रहीत हैं। वे केवल पहचान सत्यापन के लिए उपयोग किए जाते हैं।",
        aadhaarNumber: "आधार संख्या *",
        panNumber: "पैन संख्या (वैकल्पिक)",
        panPlaceholder: "ABCDE1234F",
        accountSaved: "खाता विवरण सहेजा गया!",
        welcomeAnnsetu: "अन्नसेतु में आपका स्वागत है,",
        accountSummary: "खाता सारांश",
        nameLabel: "नाम",
        mobileLabel: "मोबाइल",
        roleLabel: "भूमिका",
        steps: ['भूमिका', 'व्यक्तिगत जानकारी', 'पता', 'केवाईसी', 'पूर्ण']
    }
};

export default function RegisterScreen({ onBack, onNext, lang = 'en', setLang }) {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState('');
    const [form, setForm] = useState({
        name: '', phone: '', email: '',
        state: '', district: '', village: '', pincode: '',
        aadhaar: '', pan: '', businessName: '', storageName: '',
        mpin: '',
    });

    const updateForm = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const currentT = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const stepLabels = currentT.steps;

    const canProceed = () => {
        if (step === 1) return role !== '';
        if (step === 2) {
            const isMpinValid = role === 'farmer' ? form.mpin.length === 4 : true;
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
            return form.name.length > 1 && form.phone.length === 10 && isMpinValid && isEmailValid;
        }
        if (step === 3) return form.state !== '' && form.district !== '';
        if (step === 4) return form.aadhaar.length === 12;
        return true;
    };

    const handleAction = async () => {
        if (step === 5) {
            // Trigger OTP flow for registration
            onNext(form.phone, { ...form, role });
        } else {
            setStep(s => s + 1);
        }
    };

    const renderStepIndicator = () => (
        <View style={localStyles.stepperContainer}>
            {stepLabels.map((label, i) => {
                const idx = i + 1;
                const done = step > idx;
                const active = step === idx;
                return (
                    <View key={i} style={localStyles.stepItem}>
                        <View style={localStyles.stepCircleContainer}>
                            <View style={[
                                localStyles.stepCircle,
                                done ? localStyles.stepCircleDone : active ? localStyles.stepCircleActive : localStyles.stepCirclePending
                            ]}>
                                {done ? <Feather name="check" size={12} color={COLORS.greenDeep} /> : <Text style={[localStyles.stepNumber, active ? localStyles.stepNumberActive : localStyles.stepNumberPending]}>{idx}</Text>}
                            </View>
                            <Text style={[localStyles.stepLabel, active ? localStyles.stepLabelActive : done ? localStyles.stepLabelDone : localStyles.stepLabelPending]} numberOfLines={1}>{label}</Text>
                        </View>
                        {i < stepLabels.length - 1 && (
                            <View style={[localStyles.stepLine, done ? localStyles.stepLineDone : localStyles.stepLinePending]} />
                        )}
                    </View>
                );
            })}
        </View>
    );

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar barStyle="light-content" backgroundColor="#1E5C2E" />
            <View style={{ flex: 1 }}>
                <View style={[styles.headerTop, { paddingTop: Platform.OS === 'ios' ? 56 : 48 }]}>
                    <View style={{ width: 60, alignItems: 'flex-start' }}>
                        <TouchableOpacity style={styles.backButton} onPress={step > 1 ? () => setStep(s => s - 1) : onBack}>
                            <Feather name="arrow-left" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerBrand}>
                        <AnnsetuLogo size={38} backgroundColor="rgba(255, 255, 255, 0.15)" iconColor="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.headerBrandText}>Annsetu</Text>
                    </View>
                    <View style={{ width: 60, alignItems: 'flex-end' }}>
                        <View style={localStyles.headerLangToggle}>
                            <TouchableOpacity
                                style={[localStyles.headerLangButton, lang === 'en' && localStyles.headerLangButtonActive]}
                                onPress={() => setLang && setLang('en')}
                            >
                                <Text style={[localStyles.headerLangText, lang === 'en' && localStyles.headerLangTextActive]}>EN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[localStyles.headerLangButton, lang === 'hi' && localStyles.headerLangButtonActive]}
                                onPress={() => setLang && setLang('hi')}
                            >
                                <Text style={[localStyles.headerLangText, lang === 'hi' && localStyles.headerLangTextActive]}>हि</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <Text style={styles.headerTitle}>{currentT.createAccount}</Text>
                <Text style={styles.headerSubtitle}>{currentT.subtitleHeader}</Text>

                {renderStepIndicator()}

                <View style={[styles.bottomSection, { flex: 1, paddingHorizontal: 0, paddingBottom: 0 }]}>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl }}>
                        {step === 1 && (
                            <View>
                                <Text style={styles.title}>{currentT.iam}</Text>
                                <Text style={styles.subtitle}>{currentT.iamSub}</Text>
                                {ROLES.map(r => {
                                    const roleInfo = currentT.roles[r.key];
                                    return (
                                        <TouchableOpacity
                                            key={r.key}
                                            style={[localStyles.roleCard, role === r.key && localStyles.roleCardActive]}
                                            onPress={() => setRole(r.key)}
                                        >
                                            <Text style={{ fontSize: 32 }}>{r.emoji}</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[localStyles.roleTitle, role === r.key && localStyles.roleTitleActive]}>{roleInfo.label}</Text>
                                                <Text style={localStyles.roleSub}>{roleInfo.sub}</Text>
                                            </View>
                                            <View style={[localStyles.roleCheck, role === r.key && localStyles.roleCheckActive]}>
                                                {role === r.key && <Feather name="check" size={12} color={COLORS.white} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {step === 2 && (
                            <View>
                                <Text style={styles.title}>{currentT.personalInfo}</Text>
                                <Text style={styles.subtitle}>{currentT.personalSub}</Text>

                                {role === 'coldstorage' && (
                                    <View style={{ marginBottom: SPACING.md }}>
                                        <Text style={styles.label}>{currentT.coldStorageName}</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput style={styles.input} placeholder={currentT.coldStoragePlaceholder} placeholderTextColor="#6B7B6B" value={form.storageName} onChangeText={v => updateForm('storageName', v)} />
                                        </View>
                                    </View>
                                )}
                                {role === 'vendor' && (
                                    <View style={{ marginBottom: SPACING.md }}>
                                        <Text style={styles.label}>{currentT.businessName}</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput style={styles.input} placeholder={currentT.businessPlaceholder} placeholderTextColor="#6B7B6B" value={form.businessName} onChangeText={v => updateForm('businessName', v)} />
                                        </View>
                                    </View>
                                )}

                                <View style={{ marginBottom: SPACING.md }}>
                                    <Text style={styles.label}>{currentT.fullName}</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={styles.input} placeholder={currentT.fullNamePlaceholder} placeholderTextColor="#6B7B6B" value={form.name} onChangeText={v => updateForm('name', v)} />
                                    </View>
                                </View>

                                <View style={{ marginBottom: SPACING.md }}>
                                    <Text style={styles.label}>{currentT.mobileNumber}</Text>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputPrefix}>+91</Text>
                                        <View style={styles.inputDivider} />
                                        <TextInput style={styles.input} placeholder={currentT.mobilePlaceholder} placeholderTextColor="#6B7B6B" keyboardType="numeric" maxLength={10} value={form.phone} onChangeText={v => updateForm('phone', v.replace(/[^0-9]/g, ''))} />
                                    </View>
                                </View>

                                <View style={{ marginBottom: SPACING.md }}>
                                    <Text style={styles.label}>{currentT.emailAddress}</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={styles.input} placeholder={currentT.emailPlaceholder} placeholderTextColor="#6B7B6B" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={v => updateForm('email', v)} />
                                    </View>
                                </View>

                                {role === 'farmer' && (
                                    <View style={{ marginBottom: SPACING.md }}>
                                        <Text style={styles.label}>{currentT.setMpin}</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput style={styles.input} placeholder={currentT.mpinPlaceholder} placeholderTextColor="#6B7B6B" keyboardType="numeric" maxLength={4} value={form.mpin} onChangeText={v => updateForm('mpin', v.replace(/[^0-9]/g, ''))} />
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {step === 3 && (
                            <View>
                                <Text style={styles.title}>{currentT.addressDetails}</Text>
                                <Text style={styles.subtitle}>{currentT.addressSub}</Text>

                                <DropdownPicker
                                    label={currentT.state}
                                    placeholder={currentT.statePlaceholder}
                                    value={form.state}
                                    options={INDIAN_STATES}
                                    onSelect={(val) => {
                                        updateForm('state', val);
                                        updateForm('district', ''); // reset district when state changes
                                    }}
                                    lang={lang}
                                />

                                <DropdownPicker
                                    label={currentT.district}
                                    placeholder={currentT.districtPlaceholder}
                                    value={form.district}
                                    options={DISTRICTS_BY_STATE[form.state] || []}
                                    onSelect={(val) => updateForm('district', val)}
                                    lang={lang}
                                />

                                <View style={{ marginBottom: 16 }}>
                                    <Text style={styles.label}>{currentT.village}</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={styles.input} placeholder={currentT.villagePlaceholder} placeholderTextColor="#6B7B6B" value={form.village} onChangeText={v => updateForm('village', v)} />
                                    </View>
                                </View>

                                <View style={{ marginBottom: 16 }}>
                                    <Text style={styles.label}>{currentT.pincode}</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={styles.input} placeholder={currentT.pincodePlaceholder} placeholderTextColor="#6B7B6B" keyboardType="numeric" maxLength={6} value={form.pincode} onChangeText={v => updateForm('pincode', v.replace(/[^0-9]/g, ''))} />
                                    </View>
                                </View>
                            </View>
                        )}

                        {step === 4 && (
                            <View>
                                <Text style={styles.title}>{currentT.kycVerification}</Text>
                                <Text style={styles.subtitle}>{currentT.kycSub}</Text>

                                <View style={localStyles.alertBox}>
                                    <Feather name="shield" size={16} color="#B45309" style={{ marginTop: 2 }} />
                                    <Text style={localStyles.alertText}>{currentT.kycAlert}</Text>
                                </View>

                                <View style={{ marginBottom: SPACING.md }}>
                                    <Text style={styles.label}>{currentT.aadhaarNumber}</Text>
                                    <View style={styles.inputContainer}>
                                        <Feather name="file-text" size={16} color={COLORS.textMid} style={{ marginRight: 8 }} />
                                        <TextInput style={styles.input} placeholder="XXXX XXXX XXXX" placeholderTextColor="#6B7B6B" keyboardType="numeric" maxLength={12} value={form.aadhaar} onChangeText={v => updateForm('aadhaar', v.replace(/[^0-9]/g, ''))} />
                                    </View>
                                </View>

                                <View style={{ marginBottom: SPACING.md }}>
                                    <Text style={styles.label}>{currentT.panNumber}</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={styles.input} placeholder={currentT.panPlaceholder} placeholderTextColor="#6B7B6B" autoCapitalize="characters" maxLength={10} value={form.pan} onChangeText={v => updateForm('pan', v)} />
                                    </View>
                                </View>
                            </View>
                        )}

                        {step === 5 && (
                            <View style={localStyles.successContainer}>
                                <View style={localStyles.successIconBox}>
                                    <Feather name="check-circle" size={48} color="#10B981" />
                                </View>
                                <Text style={styles.title}>{currentT.accountSaved}</Text>
                                <Text style={styles.subtitle}>{currentT.welcomeAnnsetu}</Text>
                                <Text style={localStyles.successName}>{form.name || 'User'}</Text>

                                <View style={localStyles.summaryBox}>
                                    <Text style={localStyles.summaryTitle}>{currentT.accountSummary}</Text>
                                    <View style={localStyles.summaryRow}>
                                        <Text style={localStyles.summaryLabel}>{currentT.nameLabel}</Text>
                                        <Text style={localStyles.summaryValue}>{form.name}</Text>
                                    </View>
                                    <View style={localStyles.summaryRow}>
                                        <Text style={localStyles.summaryLabel}>{currentT.mobileLabel}</Text>
                                        <Text style={localStyles.summaryValue}>+91 {form.phone}</Text>
                                    </View>
                                    <View style={localStyles.summaryRow}>
                                        <Text style={localStyles.summaryLabel}>{currentT.roleLabel}</Text>
                                        <Text style={localStyles.summaryValue}>{currentT.roles[role]?.label}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    <View style={localStyles.footer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, canProceed() ? styles.primaryButtonActive : styles.primaryButtonDisabled]}
                            onPress={handleAction}
                            disabled={!canProceed()}
                        >
                            <Text style={styles.primaryButtonText}>{step === 5 ? currentT.verifyOtp : currentT.continue}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
