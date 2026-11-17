import { useEffect, useState } from 'react';
import Screen from './Screen.jsx';
import Teacher, { acceptPreviewToken, lockTeacher, previewAllowed } from './teacher/Teacher.jsx';
import { StudentHome, Learn, Unlock, StudentCtx } from './student/Student.jsx';
import Watch from './student/Watch.jsx';

/** Hash router.
 *  #/            student home (sessions unlock as the teacher shares them)
 *  #/u/CODE      unlock link from the teacher's QR code
 *  #/learn/N     a session's phrases, videos and practice quiz
 *  #/watch       viewing guide for the session 1 videos
 *  #/screen      projector window (follows the teacher window)
 *  #/teacher/…   password-protected teacher view
 *  #/preview/…   the student pages as the teacher tests them (only after unlocking the teacher view)
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

function StudentRoutes({ parts }) {
  const [head, ...rest] = parts;
  if (head === 'u') return <Unlock code={rest[0] || ''} />;
  if (head === 'learn') return <Learn n={+rest[0]} />;
  if (head === 'watch') return <Watch />;
  return <StudentHome />;
}

export default function App() {
  const [route, query = ''] = useRoute().split('?');
  const [head, ...rest] = route.split('/');
  useEffect(() => {
    // the teacher view asks for the password again whenever you leave it
    if (head !== 'teacher' && head !== 'preview') lockTeacher();
    document.documentElement.classList.toggle('teacher-mode', head === 'teacher');
  }, [head]);
  if (head === 'preview') {
    const k = new URLSearchParams(query).get('k');
    if (k && acceptPreviewToken(k)) {
      location.replace('#/' + route); // drop the token from the address
      return null;
    }
  }

  if (head === 'teacher') return <Teacher path={rest.join('/')} />;
  if (head === 'screen') return <Screen />;
  if (head === 'preview') {
    if (!previewAllowed()) {
      location.replace('#/');
      return null;
    }
    return (
      <StudentCtx.Provider value={{ preview: true, base: '#/preview/' }}>
        <StudentRoutes parts={rest} />
      </StudentCtx.Provider>
    );
  }
  return <StudentRoutes parts={[head, ...rest]} />;
}
