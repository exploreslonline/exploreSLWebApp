import React from 'react'
import { Link } from 'react-router-dom';
import { BsArrowLeft } from 'react-icons/bs';

const BackButton = ( {destination = '/' } ) => {
  return (
    <div className='flex'>
        <Link 
        to={destination}
        className='bg-sky-800 text-white px-10 py-10 rounded-lg w-fit'
        >
        <BsArrowLeft className='text-4*4'/>
        </Link>
        </div>
  )
}

export default BackButton