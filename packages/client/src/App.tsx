import { useEffect, useState } from 'react'
import { fooBar } from 'shared/foo'

export default function App() {
  const [state, setState] = useState()
  useEffect(() => {
    fooBar()
    fetch('/api')
      .then(res => res.json())
      .then(setState)
  }, [])

  return (
    <div>
      <h1>Welcome to our Fullstack TypeScript Project!</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}
