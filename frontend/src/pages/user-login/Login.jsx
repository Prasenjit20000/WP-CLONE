import React, { useState } from 'react'
import useLoginStore from '../../store/useLoginStore'
import countries from '../../utils/countriles';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup'
import { useNavigate } from 'react-router-dom'
import useUserStore from '../../store/useUserStore';
import { useForm } from 'react-hook-form';
import useThemeStore from '../../store/themeStore';
import { motion, spring } from 'framer-motion'
import ReactCountryFlag from "react-country-flag";
import { FaChevronDown, FaUser, FaWhatsapp } from 'react-icons/fa';
import Spinner from '../../utils/Spinner';
import { toast } from 'react-toastify';
import { sendOtp, updateUserProfile, verifyOtp } from '../../services/user.service';

// validation schema(using  use hook)
const loginValidateSchema = yup
  .object()
  .shape({
    phoneNumber: yup.string().nullable().notRequired().matches(/^\d+$/, "phone number can be digit").transform((value, originalValue) =>
      originalValue.trim() === '' ? null : value
    ),

    email: yup.string().nullable().notRequired().email('Please enter valid email').transform((value, originalValue) =>
      originalValue.trim() === '' ? null : value
    ),
  }).test(
    'at-least-one',
    'Either Email or Phone number is required',
    function (value) {
      return !!(value.phoneNumber || value.email)
    }
  );


const otpValidationSchema = yup
  .object()
  .shape({
    otp: yup.string().length(6, 'Otp must be exactly 6 digits.').required('Otp is required')
  });

const profileValidationSchema = yup
  .object()
  .shape({
    username: yup.string().required('Username is required'),
    agreed: yup.bool().oneOf([true], 'You must agree to the terms')
  });

const avatars = [
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
]

const Login = () => {
  const { step, setStep, userPhoneData, setUserPhoneData, resetLoginState } = useLoginStore();
  const { theme, setTheme } = useThemeStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false);

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors }
  } = useForm({
    resolver: yupResolver(loginValidateSchema)
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue
  } = useForm({
    resolver: yupResolver(otpValidationSchema)
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch
  } = useForm({
    resolver: yupResolver(profileValidationSchema)
  });

  const ProgressBar = () => (
    <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5 mb-6`}>
      <div className='bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out'
        style={{ width: `${(step / 3) * 100}%` }}
      >
      </div>
    </div>
  )

  const filterCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  )

  const onLoginSubmit = async()=>{
    try {
      setLoading(true);
      if(email){
        const response = await sendOtp(null,null,email);
        if(response.status === 'success'){
          toast.info('OTP is sent to your email');
          setUserPhoneData({email});
          setStep(2); 
        }
      }else{
        const response = await sendOtp(phoneNumber,selectedCountry.dialCode,null);
        if(response.status === 'success'){
          toast.info('OTP is send to your phone number');
          setUserPhoneData({phoneNumber,phoneSuffix:selectedCountry.dialCode});
          setStep(2);
        }
      }
    } catch (error) {
      console.log(error);
      setError(error.message || 'Failed to send OTP')
    }finally{
      setLoading(false);
    }
  }

  const onOtpSubmit = async()=>{
    try {
      setLoading(true);
      // if otp send is successful then always usePhoneData have some value
      if(!userPhoneData){
        throw new Error('Phone or email data is missing');
      }
      const otpString = otp.join('');
      let response;
      if(userPhoneData?.email){
        response = await verifyOtp(null,null,otpString,userPhoneData.email);
      }else{
        response = await verifyOtp(userPhoneData.phoneNumber,userPhoneData.phoneSuffix,otpString,null); 
      }
      if(response.status === 'success'){
        toast.success('OTP verified successfully');
        const user = response?.data?.user;
        if(user?.username && user?.profilePicture){
          // set user in state variable which can access by other components
          setUser(user);
          toast.success('Welcome back to Whatsapp');
          navigate('/');
          resetLoginState();
        }else{
          setStep(3);
        }
      }
    } catch (error) {
        console.log(error);
        setError(error.message || 'Failed to verify OTP')
    }finally{
      setLoading(false);
    }
  }
  // handle otp
  // when enter a number in an otp box then automatically select the next blank box
  // using this function 
  const handleOtpChange = (index,value) =>{
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue('otp',newOtp.join(''));
    if(value && index<5){
      document.getElementById(`otp-${index+1}`).focus();
    }
  } 

  // handle back when form filling
  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(['', '', '', '', '', '']);
    setError('');
  }

  // handle profilepicture
  const handleChange = (e) =>{
    const file = e.target.files[0];
    if(file){
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file)); //give url of that file which helps to preview before update
    }
  }

  // step-3 try to profile update
  const onProfileSubmit = async(data) =>{
    try {
      setLoading(true); 
      const formData = new FormData();
      formData.append('username',data.username);
      formData.append('agreed',data.agreed);
      if(profilePictureFile){
        // instead of profilepicture use media in formdata because it same name as multer middleware
        formData.append('media',profilePictureFile);
      }else{
        formData.append('profilePicture',selectedAvatar);
      }
      await updateUserProfile(formData);
      toast.success('Welcome to Whatsapp');
      navigate('/');
      resetLoginState();
    } catch (error) {
      console.log(error);
      setError(error.message || 'Failed to update user profile');
    }finally{
      setLoading(false);
    }
  }
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden p-4'}`}>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'} p-6 rounded-lg md:p-8 shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, type: spring, stiffness: 260, damping: 20 }}
          className='w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center'
        >
          <FaWhatsapp className='w-16 h-16 text-white' />
        </motion.div>

        <h1 className={`text-3xl font-bold text-center mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`} >Whatsapp Login</h1>
        <ProgressBar />

        {
          error && <p className='text-red-500 text-center mb-4'>{error}</p>
        }
        {/* upto this is common for 3 steps */}

        {
          step === 1 && (
            <form className='space-y-4' onSubmit={handleLoginSubmit(onLoginSubmit)}>
              <p className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>Enter your phone number to receive an OTP</p>
              <div className='relative'>
                <div className='flex'>
                  <div className='relative w-1/3'>
                    <button
                      type='button'
                      className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${theme === 'dark' ? 'text-white bg-gray-700 border-gray-600' : 'text-gray-900 bg-gray-100 border-gray-300'} border rounded-s-lg hover:bg-gray-200 focus:right-4 focus:outline-none focus:ring-gray-100`}
                      onClick={() => setShowDropdown(!showDropdown)}
                    >
                      <span>
                        <ReactCountryFlag className='pr-1' countryCode={selectedCountry.alpha2} svg style={{ width: "1.5em", height: "1.5em" }} />
                        {selectedCountry.dialCode}
                      </span>
                      <FaChevronDown className='ml-2' />
                    </button>
                    {
                      showDropdown && (
                        <div className={`absolute z-10 w-full mt-1 
                        ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} 
                        border rounded-md shadow-lg max-h-60 overflow-auto`}>
                          <div className={`sticky top-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} p-2`}>
                            <input
                              text='text'
                              placeholder='Search Countries...'
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className={`w-full px-2 py-1 border 
                                ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}
                                 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500`}
                            />
                          </div>
                          {filterCountries.map((country) => (
                            <button key={country.alpha2}
                              className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} focus:outline-none focus:bg-gray-100`}
                              onClick={() => {
                                setSelectedCountry(country)
                                setShowDropdown(false)
                              }}
                            >
                              <ReactCountryFlag className='pr-1' countryCode={country.alpha2} svg style={{ width: "1.5em", height: "1.5em" }} />
                              ({country.dialCode}) {country.name}
                            </button>
                          ))}
                        </div>
                      )
                    }
                  </div>
                  <input
                    type='text'
                    {...loginRegister('phoneNumber')}
                    value={phoneNumber}
                    placeholder='Phone Number'
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-2/3 px-4 py-2 border
                         ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} 
                      rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500
                      ${loginErrors.phoneNumber ? 'border-red-500' : ''}`}
                  />
                </div>
                {
                  loginErrors.phoneNumber && (
                    <p className='text-red-500 text-sm'>{loginErrors.phoneNumber}</p>
                  )
                }
              </div>

              {/* divider */}
              <div className='flex items-center my-4'>
                <div className='flex-grow h-px bg-gray-300' />
                <span className='mx-3 text-gray-500 text-sm font-medium'>or</span>
                <div className='flex-grow h-px bg-gray-300' />
              </div>

              {/* email input box */}
              <div className={`flex items-center border rounded-md px-3 py-2
                ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                <FaUser className={`mr-2 text-gray-400 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type='text'
                  {...loginRegister('email')}
                  value={email}
                  placeholder='Email (optional)'
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-transparent focus:outline-none
                         ${theme === 'dark' ? 'text-white' : 'text-black'} 
                      ${loginErrors.email ? 'border-red-500' : ''}`}
                />
                 {
                  loginErrors.email && (
                    <p className='text-red-500 text-sm'>{loginErrors.email}</p>
                  )
                }
              </div>
              <button className='w-full text-white py-2 bg-green-500 rounded-md hover:bg-green-600 transition ' type='submit'>
                {!loading ? <Spinner/>:'Send OTP'}
              </button>
            </form>
          )
        }
      </motion.div>


    </div>
  )
}

export default Login