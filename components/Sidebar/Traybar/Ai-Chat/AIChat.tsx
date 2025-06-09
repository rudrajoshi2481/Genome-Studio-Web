import React from 'react'
import Appbar from './Appbar'
import Footer from './Footer'

function AIChat() {
  return (
    <div className='h-[calc(100vh-56px)] flex flex-col justify-between mx-4'>
        <Appbar />
        <Footer />
    </div>
  )
}

export default AIChat