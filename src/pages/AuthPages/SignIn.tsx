import PageMeta from "../../components/atoms/PageMeta";
import AuthTemplate from "../../components/templates/AuthTemplate";
import SignInForm from "../../components/organisms/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | Visia"
        description="Masuk ke Visia"
      />
      <AuthTemplate>
        <SignInForm />
      </AuthTemplate>
    </>
  );
}
