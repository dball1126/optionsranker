import { Link } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { LoginForm } from '@/components/auth/LoginForm';
import { BarChart3 } from 'lucide-react';

export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Sign in to OptionsRanker</h1>
          <p className="text-sm text-slate-400 mt-2">
            Access your portfolio, strategies, and learning progress
          </p>
        </div>

        <Card>
          <CardBody className="p-6">
            <LoginForm />
          </CardBody>
          <CardFooter className="text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
