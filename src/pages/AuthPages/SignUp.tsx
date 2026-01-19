import PageMeta from "../../components/atoms/PageMeta";
import AuthTemplate from "../../components/templates/AuthTemplate";
import SignUpForm from "../../components/organisms/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="SignUp | Visia"
        description="Create a new account"
      />
      <AuthTemplate>
        <SignUpForm />
      </AuthTemplate>
    </>
  );
}
