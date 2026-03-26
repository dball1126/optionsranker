import { Link } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { BarChart3 } from 'lucide-react';

export function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Create your account</h1>
          <p className="text-sm text-slate-400 mt-2">
            Start learning and analyzing options strategies today
          </p>
        </div>

        <Card>
          <CardBody className="p-6">
            <RegisterForm />
          </CardBody>
          <CardFooter className="text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
