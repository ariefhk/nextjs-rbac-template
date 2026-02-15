import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Next.js RBAC Template
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A complete Role-Based Access Control implementation with Next.js 14
          and Prisma
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="text-left space-y-2 text-gray-700">
            <li>✅ JWT Authentication with HTTP-only cookies</li>
            <li>✅ Flexible role and permission system</li>
            <li>✅ Permission guards for React components</li>
            <li>✅ Protected routes with middleware</li>
            <li>✅ Pre-seeded database with test users</li>
            <li>✅ TypeScript and Tailwind CSS</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Go to Login
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Test Credentials</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>Admin:</strong> admin@example.com / password123
            </p>
            <p>
              <strong>Moderator:</strong> moderator@example.com / password123
            </p>
            <p>
              <strong>User:</strong> user@example.com / password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
