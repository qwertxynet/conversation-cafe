import { useEffect, useState } from 'react';
import Host from './host/Host.jsx';
import Screen from './screen/Screen.jsx';
import Phone from './phone/Phone.jsx';

/** Hash router.
 *  #/  or #/join/PIN   students' phones (join with the PIN, then play)
 *  #/join/PIN?test=1   the teacher's test player
 *  #/screen            the projector window
 *  #/host/…            the teacher's control window (password)
 */
function useRoute() {
  const get = () => location.hash.replace(/^#\/?/, '');
  const [r, setR] = useState(get);
  useEffect(() => {
    const on = () => setR(get());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return r;
}

export default function App() {
  const [path, query = ''] = useRoute().split('?');
  const [head, ...rest] = path.split('/');
  useEffect(() => {
    document.title = head === 'host' ? 'مقهى المحادثة · Teacher' : head === 'screen' ? 'مقهى المحادثة · Screen' : 'مقهى المحادثة';
  }, [head]);
  if (head === 'host') return <Host tab={rest[0]} />;
  if (head === 'screen') return <Screen />;
  const pin = head === 'join' ? (rest[0] || '').replace(/\D/g, '').slice(0, 4) : '';
  const test = new URLSearchParams(query).get('test') === '1';
  return <Phone key={pin + (test ? 't' : '')} pin={pin} test={test} />;
}
