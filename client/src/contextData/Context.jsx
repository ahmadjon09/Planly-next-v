import { createContext, useEffect, useState } from 'react'
import Cookies from 'js-cookie'
export const ContextData = createContext()

export const ContextProvider = ({ children }) => {
  const [user, setUser] = useState({})
  const [openX, setOpenX] = useState(false)
  const [netErr, setNetErr] = useState(false)
  const [pingms, setPingms] = useState(0)
  const [ping, setPing] = useState(false)
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('dark') === '!true'
  })
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem('is_DCC') === '!true'
  })

  useEffect(() => {
    localStorage.setItem('dark', dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const setUserToken = (token) => {
    Cookies.set('user_token', token, { expires: 7 })
  }


  const removeUserToken = () => {
    Cookies.remove('user_token')
  }
  return (
    <ContextData.Provider
      value={{
        dark,
        setDark,
        setUserToken,
        removeUserToken,
        setUser,
        user,
        netErr,
        setNetErr,
        ping,
        setPing,
        openX,
        setOpenX,
        pingms,
        setPingms
      }}
    >
      <>
        {children}
      </>
    </ContextData.Provider>
  )
}
