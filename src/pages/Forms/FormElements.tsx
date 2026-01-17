import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import DefaultInputs from "../../components/organisms/Forms/DefaultInputs";
import InputGroup from "../../components/organisms/Forms/InputGroup";
import DropzoneComponent from "../../components/organisms/Forms/DropZone";
import FileInputExample from "../../components/organisms/Forms/FileInputExample";
import CheckboxComponents from "../../components/organisms/Forms/CheckboxComponents";
import RadioButtons from "../../components/organisms/Forms/RadioButtons";
import ToggleSwitch from "../../components/organisms/Forms/ToggleSwitch";
import SelectInputs from "../../components/organisms/Forms/SelectInputs";
import TextAreaInput from "../../components/organisms/Forms/TextAreaInput";
// import InputStates from "../../components/organisms/Forms/InputStates";
import PageMeta from "../../components/atoms/PageMeta";

export default function FormElements() {
  return (
    <div>
      <PageMeta
        title="React.js Form Elements Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Form Elements  Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Form Elements" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DefaultInputs />
          <SelectInputs />
          <TextAreaInput />
          {/* <InputStates /> */}
        </div>
        <div className="space-y-6">
          <InputGroup />
          <FileInputExample />
          <CheckboxComponents />
          <RadioButtons />
          <ToggleSwitch />
          <DropzoneComponent />
        </div>
      </div>
    </div>
  );
}
