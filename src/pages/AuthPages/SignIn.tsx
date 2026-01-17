import PageMeta from "../../components/atoms/PageMeta";
import AuthTemplate from "../../components/templates/AuthTemplate";
import SignInForm from "../../components/organisms/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | Sistem Absen"
        description="Masuk ke Sistem Absensi"
      />
      <AuthTemplate>
        <SignInForm />
      </AuthTemplate>
    </>
  );
}
